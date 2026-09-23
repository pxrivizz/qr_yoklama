import "server-only";

import QRCode from "qrcode";

import { prisma } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { ApiError } from "@/lib/http/api-error";
import type { RequestContext } from "@/lib/http/request-context";
import {
  issueQrToken,
  QR_TOKEN_LIFETIME_SECONDS,
} from "@/lib/attendance/qr-token";
import { calculateNextSessionSlot } from "@/lib/attendance/schedule";
import { getTeacherCourse } from "@/lib/courses/service";
import { createAttendanceNotifications } from "@/lib/notifications/service";
import type { ManualAttendanceInput } from "@/lib/attendance/manual-schema";
import type { StartAttendanceSessionInput } from "@/lib/attendance/start-schema";

async function assertCourseOwnership(teacherId: string, courseId: string) {
  return getTeacherCourse(teacherId, courseId);
}

export async function startAttendanceSession(
  teacherId: string,
  courseId: string,
  input: StartAttendanceSessionInput,
  context: RequestContext,
) {
  const course = await assertCourseOwnership(teacherId, courseId);

  if (
    input.weekNumber > course.totalWeeks ||
    input.sessionIndexInWeek > course.weeklySessionCount
  ) {
    throw new ApiError(
      400,
      "SESSION_SLOT_OUT_OF_RANGE",
      `Bu ders için 1-${course.totalWeeks}. haftalar ve haftada 1-${course.weeklySessionCount}. oturumlar seçilebilir.`,
    );
  }

  const session = await prisma.$transaction(async (tx) => {
    const existing = await tx.attendanceSession.findFirst({
      where: { courseId, status: "ACTIVE" },
      select: { id: true },
    });

    if (existing) {
      throw new ApiError(
        409,
        "SESSION_ALREADY_ACTIVE",
        "Bu ders için zaten aktif bir yoklama oturumu var.",
      );
    }

    const duplicate = await tx.attendanceSession.findFirst({
      where: {
        courseId,
        weekNumber: input.weekNumber,
        sessionIndexInWeek: input.sessionIndexInWeek,
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ApiError(
        409,
        "SESSION_SLOT_ALREADY_USED",
        `Hafta ${input.weekNumber}, oturum ${input.sessionIndexInWeek} için daha önce yoklama alınmış.`,
      );
    }

    const created = await tx.attendanceSession.create({
      data: {
        courseId,
        weekNumber: input.weekNumber,
        sessionIndexInWeek: input.sessionIndexInWeek,
        createdBy: "SYSTEM_QR",
        createdByUserId: teacherId,
        schoolLat: course.schoolLat,
        schoolLng: course.schoolLng,
        allowedRadiusMeters: course.allowedRadiusMeters,
        allowedIpRanges: course.allowedIpRanges,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: teacherId,
        action: "SESSION_STARTED",
        entityType: "AttendanceSession",
        entityId: created.id,
        after: {
          courseId,
          weekNumber: input.weekNumber,
          sessionIndexInWeek: input.sessionIndexInWeek,
        },
        ...context,
      },
    });

    return created;
  });

  try {
    const state = await getActiveSessionState(teacherId, courseId, session.id);
    // Trigger in-app notifications for enrolled students after session is successfully active
    await createAttendanceNotifications(courseId, session.id);
    return state;
  } catch (error) {
    await prisma.attendanceSession.delete({ where: { id: session.id } }).catch(() => undefined);
    throw error;
  }
}

async function ensureCurrentQrToken(sessionId: string) {
  const now = new Date();
  const active = await prisma.qrToken.findFirst({
    where: { sessionId, expiresAt: { gt: now } },
    orderBy: { expiresAt: "desc" },
  });

  if (active) {
    return active;
  }

  const { QR_SIGNING_SECRET } = getServerEnv();
  const issued = await issueQrToken(sessionId, QR_SIGNING_SECRET, now);

  return prisma.qrToken.create({
    data: {
      sessionId,
      issuedAt: new Date(issued.claims.iat * 1000),
      expiresAt: new Date(issued.claims.exp * 1000),
      nonceHash: issued.nonceHash,
      signature: issued.token,
    },
  });
}

async function buildQrPayload(token: string) {
  const { NEXT_PUBLIC_APP_URL } = getServerEnv();
  const scanUrl = `${NEXT_PUBLIC_APP_URL}/tara?token=${encodeURIComponent(token)}`;
  const dataUrl = await QRCode.toDataURL(scanUrl, {
    width: 512,
    margin: 2,
    color: { dark: "#1B2A4A", light: "#FFFFFF" },
  });

  return { scanUrl, dataUrl };
}

export async function getActiveSessionState(
  teacherId: string,
  courseId: string,
  sessionId?: string,
) {
  await assertCourseOwnership(teacherId, courseId);

  const session = await prisma.attendanceSession.findFirst({
    where: {
      courseId,
      status: "ACTIVE",
      ...(sessionId ? { id: sessionId } : {}),
    },
    include: {
      course: { select: { name: true, code: true, _count: { select: { enrollments: true } } } },
      _count: { select: { attendanceRecords: true } },
    },
  });

  if (!session) return null;

  const tokenRecord = await ensureCurrentQrToken(session.id);
  const { scanUrl, dataUrl } = await buildQrPayload(tokenRecord.signature);

  return {
    sessionId: session.id,
    courseName: session.course.name,
    courseCode: session.course.code,
    weekNumber: session.weekNumber,
    sessionIndexInWeek: session.sessionIndexInWeek,
    presentCount: session._count.attendanceRecords,
    enrollmentCount: session.course._count.enrollments,
    qrDataUrl: dataUrl,
    scanUrl,
    expiresAt: tokenRecord.expiresAt.toISOString(),
    tokenLifetimeSeconds: QR_TOKEN_LIFETIME_SECONDS,
  };
}

export async function closeAttendanceSession(
  teacherId: string,
  courseId: string,
  context: RequestContext,
) {
  await assertCourseOwnership(teacherId, courseId);

  const session = await prisma.attendanceSession.findFirst({
    where: { courseId, status: "ACTIVE" },
    select: { id: true },
  });

  if (!session) {
    throw new ApiError(404, "SESSION_NOT_FOUND", "Aktif yoklama oturumu bulunamadı.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.attendanceSession.update({
      where: { id: session.id },
      data: { status: "CLOSED", endedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        actorId: teacherId,
        action: "SESSION_CLOSED",
        entityType: "AttendanceSession",
        entityId: session.id,
        ...context,
      },
    });
  });
}

export async function getManualAttendanceRoster(teacherId: string, courseId: string) {
  const course = await assertCourseOwnership(teacherId, courseId);
  const [enrollments, completedCount] = await Promise.all([
    prisma.enrollment.findMany({
      where: { courseId },
      orderBy: [{ fullNameOnList: "asc" }],
      select: {
        id: true,
        fullNameOnList: true,
        schoolNumberOnList: true,
        isMandatory: true,
        matchedUser: {
          select: { image: true },
        },
      },
    }),
    prisma.attendanceSession.count({ where: { courseId, status: "CLOSED" } }),
  ]);

  return {
    course,
    slot: calculateNextSessionSlot(completedCount, course.weeklySessionCount),
    enrollments,
  };
}

export async function createManualAttendanceSession(
  teacherId: string,
  courseId: string,
  input: ManualAttendanceInput,
  context: RequestContext,
) {
  const { course, enrollments } = await getManualAttendanceRoster(teacherId, courseId);
  if (
    input.weekNumber > course.totalWeeks ||
    input.sessionIndexInWeek > course.weeklySessionCount
  ) {
    throw new ApiError(
      400,
      "SESSION_SLOT_OUT_OF_RANGE",
      `Bu ders için 1-${course.totalWeeks}. haftalar ve haftada 1-${course.weeklySessionCount}. oturumlar seçilebilir.`,
    );
  }
  if (enrollments.length === 0) {
    throw new ApiError(
      409,
      "COURSE_HAS_NO_STUDENTS",
      "Bu derste öğrenci yok. Önce öğrenci listesini içe aktarın.",
    );
  }

  const submittedIds = new Set(input.records.map((record) => record.enrollmentId));
  const enrollmentIds = new Set(enrollments.map((enrollment) => enrollment.id));
  if (
    submittedIds.size !== enrollments.length ||
    input.records.length !== enrollments.length ||
    [...submittedIds].some((id) => !enrollmentIds.has(id))
  ) {
    throw new ApiError(
      400,
      "INVALID_ATTENDANCE_ROSTER",
      "Öğrenci listesi değişti. Sayfayı yenileyip yoklamayı tekrar işaretleyin.",
    );
  }

  const activeSession = await prisma.attendanceSession.findFirst({
    where: { courseId, status: "ACTIVE" },
    select: { id: true },
  });
  if (activeSession) {
    throw new ApiError(
      409,
      "SESSION_ALREADY_ACTIVE",
      "Bu ders için canlı yoklama sürüyor. Önce canlı yoklamayı bitirin.",
    );
  }

  const duplicate = await prisma.attendanceSession.findFirst({
    where: {
      courseId,
      weekNumber: input.weekNumber,
      sessionIndexInWeek: input.sessionIndexInWeek,
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new ApiError(
      409,
      "SESSION_SLOT_ALREADY_USED",
      `Hafta ${input.weekNumber}, oturum ${input.sessionIndexInWeek} için daha önce yoklama alınmış.`,
    );
  }

  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const session = await tx.attendanceSession.create({
      data: {
        courseId,
        weekNumber: input.weekNumber,
        sessionIndexInWeek: input.sessionIndexInWeek,
        startedAt: now,
        endedAt: now,
        status: "CLOSED",
        createdBy: "TEACHER_MANUAL",
        createdByUserId: teacherId,
        schoolLat: course.schoolLat,
        schoolLng: course.schoolLng,
        allowedRadiusMeters: course.allowedRadiusMeters,
        allowedIpRanges: course.allowedIpRanges,
      },
    });

    await tx.attendanceRecord.createMany({
      data: input.records.map((record) => ({
        sessionId: session.id,
        enrollmentId: record.enrollmentId,
        source: "TEACHER_MANUAL" as const,
        status: record.status,
        recordedAt: now,
        enteredByTeacherId: teacherId,
      })),
    });

    await tx.auditLog.create({
      data: {
        actorId: teacherId,
        action: "MANUAL_ATTENDANCE_SAVED",
        entityType: "AttendanceSession",
        entityId: session.id,
        after: {
          courseId,
          weekNumber: input.weekNumber,
          sessionIndexInWeek: input.sessionIndexInWeek,
          recordCount: input.records.length,
        },
        ...context,
      },
    });

    return session;
  });
}

export type StudentActiveSessionItem = {
  sessionId: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  weekNumber: number;
  sessionIndexInWeek: number;
  startedAt: Date;
  alreadyAttended: boolean;
  attendedStatus: string | null;
};

export async function getStudentActiveSessions(studentId: string): Promise<StudentActiveSessionItem[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: { matchedUserId: studentId },
    select: {
      id: true,
      courseId: true,
      course: {
        select: {
          id: true,
          name: true,
          code: true,
          attendanceSessions: {
            where: { status: "ACTIVE" },
            orderBy: { startedAt: "desc" },
            take: 1,
            select: {
              id: true,
              weekNumber: true,
              sessionIndexInWeek: true,
              startedAt: true,
              status: true,
            },
          },
        },
      },
      attendanceRecords: {
        where: {
          session: { status: "ACTIVE" },
        },
        select: {
          sessionId: true,
          status: true,
          recordedAt: true,
        },
      },
    },
  });

  const activeSessions: StudentActiveSessionItem[] = [];

  for (const enrollment of enrollments) {
    const session = enrollment.course.attendanceSessions[0];
    if (!session) continue;

    const record = enrollment.attendanceRecords.find((r) => r.sessionId === session.id);

    activeSessions.push({
      sessionId: session.id,
      courseId: enrollment.course.id,
      courseName: enrollment.course.name,
      courseCode: enrollment.course.code,
      weekNumber: session.weekNumber,
      sessionIndexInWeek: session.sessionIndexInWeek,
      startedAt: session.startedAt,
      alreadyAttended: Boolean(record),
      attendedStatus: record?.status ?? null,
    });
  }

  return activeSessions;
}

