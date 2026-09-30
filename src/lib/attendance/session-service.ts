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
import { buildManualAttendanceRecords } from "@/lib/attendance/manual-state";
import { getTeacherCourse } from "@/lib/courses/service";
import { createAttendanceNotifications } from "@/lib/notifications/service";
import type { ManualAttendanceInput } from "@/lib/attendance/manual-schema";
import type { StartAttendanceSessionInput } from "@/lib/attendance/start-schema";
import type { ResetAttendanceSessionInput } from "@/lib/attendance/reset-schema";
import {
  isPreparatorySlot,
  lessonCountForDate,
  parseSessionDate,
  sessionDateKey,
  todayInIstanbul,
  type AttendanceSlot,
} from "@/lib/attendance/slot";

async function assertCourseOwnership(teacherId: string, courseId: string) {
  return getTeacherCourse(teacherId, courseId);
}

type AttendanceCourse = Awaited<ReturnType<typeof assertCourseOwnership>>;

function validateCourseSlot(course: AttendanceCourse, input: AttendanceSlot) {
  if (course.attendanceMode === "PREPARATORY") {
    if (!isPreparatorySlot(input)) {
      throw new ApiError(
        400,
        "PREPARATORY_SLOT_REQUIRED",
        "Hazırlık sınıfı için tarih ve ders sırası seçin.",
      );
    }
    let sessionDate: Date;
    try {
      sessionDate = parseSessionDate(input.sessionDate);
    } catch {
      throw new ApiError(400, "INVALID_SESSION_DATE", "Geçerli bir yoklama tarihi seçin.");
    }
    const lessonCount = lessonCountForDate(course.preparatoryDayPlans, sessionDate);
    if (lessonCount === 0) {
      throw new ApiError(
        400,
        "NO_LESSONS_ON_SELECTED_DAY",
        "Seçilen gün için hazırlık dersi tanımlanmamış.",
      );
    }
    if (input.lessonPeriod > lessonCount) {
      throw new ApiError(
        400,
        "SESSION_SLOT_OUT_OF_RANGE",
        `Seçilen gün için 1-${lessonCount}. dersler seçilebilir.`,
      );
    }
    return {
      slotType: "CALENDAR_PERIOD" as const,
      sessionDate,
      lessonPeriod: input.lessonPeriod,
      weekNumber: null,
      sessionIndexInWeek: null,
    };
  }

  if (isPreparatorySlot(input)) {
    throw new ApiError(
      400,
      "WEEKLY_SLOT_REQUIRED",
      "Normal ders için hafta ve oturum seçin.",
    );
  }
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
  return {
    slotType: "WEEKLY" as const,
    weekNumber: input.weekNumber,
    sessionIndexInWeek: input.sessionIndexInWeek,
    sessionDate: null,
    lessonPeriod: null,
  };
}

function slotWhere(courseId: string, slot: ReturnType<typeof validateCourseSlot>) {
  return slot.slotType === "CALENDAR_PERIOD"
    ? { courseId, sessionDate: slot.sessionDate, lessonPeriod: slot.lessonPeriod }
    : {
        courseId,
        weekNumber: slot.weekNumber,
        sessionIndexInWeek: slot.sessionIndexInWeek,
      };
}

export async function startAttendanceSession(
  teacherId: string,
  courseId: string,
  input: StartAttendanceSessionInput,
  context: RequestContext,
) {
  const course = await assertCourseOwnership(teacherId, courseId);
  const slot = validateCourseSlot(course, input);

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
      where: slotWhere(courseId, slot),
      select: { id: true },
    });
    if (duplicate) {
      throw new ApiError(
        409,
        "SESSION_SLOT_ALREADY_USED",
        slot.slotType === "CALENDAR_PERIOD"
          ? `${sessionDateKey(slot.sessionDate!)} tarihindeki ${slot.lessonPeriod}. ders için daha önce yoklama alınmış.`
          : `Hafta ${slot.weekNumber}, oturum ${slot.sessionIndexInWeek} için daha önce yoklama alınmış.`,
      );
    }

    const created = await tx.attendanceSession.create({
      data: {
        courseId,
        ...slot,
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
          ...slot,
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
    width: 1024,
    margin: 4,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#FFFFFF" },
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
    slotType: session.slotType,
    weekNumber: session.weekNumber,
    sessionIndexInWeek: session.sessionIndexInWeek,
    sessionDate: session.sessionDate ? sessionDateKey(session.sessionDate) : null,
    lessonPeriod: session.lessonPeriod,
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

export async function resetAttendanceSession(
  teacherId: string,
  courseId: string,
  input: ResetAttendanceSessionInput,
  context: RequestContext,
) {
  const course = await assertCourseOwnership(teacherId, courseId);

  return prisma.$transaction(async (tx) => {
    const session = await tx.attendanceSession.findFirst({
      where: { id: input.sessionId, courseId },
      select: {
        id: true,
        status: true,
        startedAt: true,
        endedAt: true,
        createdBy: true,
        slotType: true,
        weekNumber: true,
        sessionIndexInWeek: true,
        sessionDate: true,
        lessonPeriod: true,
      },
    });

    if (!session) {
      throw new ApiError(404, "SESSION_NOT_FOUND", "Sıfırlanacak eski yoklama oturumu bulunamadı.");
    }
    if (session.status !== "CLOSED") {
      throw new ApiError(409, "SESSION_NOT_CLOSED", "Aktif bir yoklama oturumu sıfırlanamaz.");
    }

    const attendanceRecordCount = await tx.attendanceRecord.count({
      where: { sessionId: session.id },
    });
    const attendanceAttemptCount = await tx.attendanceAttempt.count({
      where: { sessionId: session.id },
    });
    const qrScanLogCount = await tx.qrScanLog.count({ where: { sessionId: session.id } });
    const notificationCount = await tx.notification.count({ where: { sessionId: session.id } });

    await tx.notification.deleteMany({ where: { sessionId: session.id } });
    await tx.qrScanLog.deleteMany({ where: { sessionId: session.id } });
    await tx.attendanceAttempt.deleteMany({ where: { sessionId: session.id } });
    await tx.attendanceSession.delete({ where: { id: session.id } });

    const deleted = {
      sessionCount: 1,
      attendanceRecordCount,
      attendanceAttemptCount,
      qrScanLogCount,
      notificationCount,
    };

    await tx.auditLog.create({
      data: {
        actorId: teacherId,
        action: "SESSION_ATTENDANCE_RESET",
        entityType: "AttendanceSession",
        entityId: session.id,
        before: {
          courseCode: course.code,
          courseName: course.name,
          slotType: session.slotType,
          weekNumber: session.weekNumber,
          sessionIndexInWeek: session.sessionIndexInWeek,
          sessionDate: session.sessionDate,
          lessonPeriod: session.lessonPeriod,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
          createdBy: session.createdBy,
          ...deleted,
        },
        after: { sessionDeleted: true },
        ...context,
      },
    });

    return deleted;
  });
}

export async function getManualAttendanceRoster(teacherId: string, courseId: string) {
  const course = await assertCourseOwnership(teacherId, courseId);
  const [enrollments, sessions, completedCount] = await Promise.all([
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
    prisma.attendanceSession.findMany({
      where: { courseId },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        slotType: true,
        weekNumber: true,
        sessionIndexInWeek: true,
        sessionDate: true,
        lessonPeriod: true,
        status: true,
        createdBy: true,
        attendanceRecords: {
          select: { enrollmentId: true, status: true },
        },
      },
    }),
    prisma.attendanceSession.count({ where: { courseId, status: "CLOSED" } }),
  ]);

  const selectedSession = sessions.find((session) => session.status === "ACTIVE")
    ?? sessions.find((session) => session.createdBy === "SYSTEM_QR")
    ?? sessions[0]
    ?? null;
  const nextWeeklySlot = calculateNextSessionSlot(completedCount, course.weeklySessionCount);
  const slot = course.attendanceMode === "PREPARATORY"
    ? {
        sessionDate: selectedSession?.sessionDate
          ? sessionDateKey(selectedSession.sessionDate)
          : todayInIstanbul(),
        lessonPeriod: selectedSession?.lessonPeriod ?? 1,
      }
    : {
        weekNumber: selectedSession?.weekNumber ?? nextWeeklySlot.weekNumber,
        sessionIndexInWeek:
          selectedSession?.sessionIndexInWeek ?? nextWeeklySlot.sessionIndexInWeek,
      };

  return {
    course,
    slot,
    enrollments,
    initialSession: selectedSession
      ? {
          id: selectedSession.id,
          status: selectedSession.status,
          createdBy: selectedSession.createdBy,
        }
      : null,
    initialRecords: buildManualAttendanceRecords(
      enrollments.map((enrollment) => enrollment.id),
      selectedSession?.attendanceRecords ?? [],
    ),
  };
}

export async function getManualAttendanceSlot(
  teacherId: string,
  courseId: string,
  input: AttendanceSlot,
) {
  const course = await assertCourseOwnership(teacherId, courseId);
  const slot = validateCourseSlot(course, input);

  const [enrollments, session] = await Promise.all([
    prisma.enrollment.findMany({ where: { courseId }, select: { id: true } }),
    prisma.attendanceSession.findFirst({
      where: slotWhere(courseId, slot),
      select: {
        id: true,
        status: true,
        createdBy: true,
        attendanceRecords: { select: { enrollmentId: true, status: true } },
      },
    }),
  ]);

  return {
    session: session
      ? { id: session.id, status: session.status, createdBy: session.createdBy }
      : null,
    records: buildManualAttendanceRecords(
      enrollments.map((enrollment) => enrollment.id),
      session?.attendanceRecords ?? [],
    ),
  };
}

export async function createManualAttendanceSession(
  teacherId: string,
  courseId: string,
  input: ManualAttendanceInput,
  context: RequestContext,
) {
  const { course, enrollments } = await getManualAttendanceRoster(teacherId, courseId);
  const slot = validateCourseSlot(course, input);
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

  const [activeSession, existingSession] = await Promise.all([
    prisma.attendanceSession.findFirst({
      where: { courseId, status: "ACTIVE" },
      select: { id: true },
    }),
    prisma.attendanceSession.findFirst({
      where: slotWhere(courseId, slot),
      select: {
        id: true,
        status: true,
        endedAt: true,
        attendanceRecords: {
          select: { id: true, enrollmentId: true, status: true },
        },
      },
    }),
  ]);
  if (activeSession && activeSession.id !== existingSession?.id) {
    throw new ApiError(
      409,
      "SESSION_ALREADY_ACTIVE",
      "Bu ders için canlı yoklama sürüyor. Önce canlı yoklamayı bitirin.",
    );
  }

  const now = new Date();
  return prisma.$transaction(async (tx) => {
    if (existingSession) {
      const existingByEnrollment = new Map(
        existingSession.attendanceRecords.map((record) => [record.enrollmentId, record]),
      );

      const changedRecords = input.records.filter(
        (record) => existingByEnrollment.get(record.enrollmentId)?.status !== record.status,
      );
      for (const record of changedRecords) {
        const existingRecord = existingByEnrollment.get(record.enrollmentId);
        if (existingRecord) {
          await tx.attendanceRecord.update({
            where: { id: existingRecord.id },
            data: {
              status: record.status,
              enteredByTeacherId: teacherId,
              editedAt: now,
            },
          });
        } else {
          await tx.attendanceRecord.create({
            data: {
              sessionId: existingSession.id,
              enrollmentId: record.enrollmentId,
              source: "TEACHER_MANUAL",
              status: record.status,
              recordedAt: now,
              enteredByTeacherId: teacherId,
            },
          });
        }
      }

      const session = await tx.attendanceSession.update({
        where: { id: existingSession.id },
        data: {
          status: "CLOSED",
          endedAt: existingSession.endedAt ?? now,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: teacherId,
          action: "MANUAL_ATTENDANCE_UPDATED",
          entityType: "AttendanceSession",
          entityId: session.id,
          after: {
            courseId,
            ...slot,
            recordCount: input.records.length,
            changedRecordCount: changedRecords.length,
          },
          ...context,
        },
      });

      return session;
    }

    const session = await tx.attendanceSession.create({
      data: {
        courseId,
        ...slot,
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
          ...slot,
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
  slotType: "WEEKLY" | "CALENDAR_PERIOD";
  weekNumber: number | null;
  sessionIndexInWeek: number | null;
  sessionDate: string | null;
  lessonPeriod: number | null;
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
              slotType: true,
              weekNumber: true,
              sessionIndexInWeek: true,
              sessionDate: true,
              lessonPeriod: true,
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
      slotType: session.slotType,
      weekNumber: session.weekNumber,
      sessionIndexInWeek: session.sessionIndexInWeek,
      sessionDate: session.sessionDate ? sessionDateKey(session.sessionDate) : null,
      lessonPeriod: session.lessonPeriod,
      startedAt: session.startedAt,
      alreadyAttended: Boolean(record),
      attendedStatus: record?.status ?? null,
    });
  }

  return activeSessions;
}
