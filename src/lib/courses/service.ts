import "server-only";

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http/api-error";
import type { RequestContext } from "@/lib/http/request-context";
import { calculatePlannedSessionCount } from "@/lib/attendance/schedule";
import { sessionDateKey, weekdayForSessionDate } from "@/lib/attendance/slot";
import { DEFAULT_ATTENDANCE_POLICY, type AttendancePolicy } from "@/lib/attendance/policy";
import { courseAccessWhere } from "@/lib/courses/permissions";

import type { CreateCourseInput, UpdateCourseInput } from "./schema";

const courseSelect = {
  id: true,
  name: true,
  code: true,
  schoolLat: true,
  schoolLng: true,
  allowedRadiusMeters: true,
  allowedIpRanges: true,
  weeklySessionCount: true,
  totalWeeks: true,
  attendanceMode: true,
  mandatoryAlertLimit: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      enrollments: { where: { archivedAt: null } },
      attendanceSessions: { where: { status: "CLOSED" as const } },
    },
  },
  attendanceSessions: {
    select: {
      id: true,
      status: true,
      weekNumber: true,
      sessionIndexInWeek: true,
      sessionDate: true,
      lessonPeriod: true,
      slotType: true,
    },
  },
  preparatoryDayPlans: {
    orderBy: { weekday: "asc" as const },
    select: { weekday: true, lessonCount: true },
  },
  attendancePolicy: {
    select: {
      photoMode: true,
      networkMode: true,
      locationMode: true,
      deviceMode: true,
      maxLocationAccuracyMeters: true,
      lateAfterMinutes: true,
    },
  },
  members: {
    orderBy: { createdAt: "asc" as const },
    select: {
      role: true,
      user: { select: { id: true, name: true, email: true } },
    },
  },
} as const;

function serializeCourse(course: Awaited<ReturnType<typeof findOwnedCourse>>) {
  if (!course) return null;

  return {
    ...course,
    plannedSessionCount: calculatePlannedSessionCount(
      course.weeklySessionCount,
      course.totalWeeks,
    ),
    allAttendanceSessionCount: course.attendanceSessions.length,
    hasActiveSession: course.attendanceSessions.some((session) => session.status === "ACTIVE"),
    completedSessions: course.attendanceSessions
      .filter((session) => session.status === "CLOSED")
      .map((session) => ({
        id: session.id,
        slotType: session.slotType,
        weekNumber: session.weekNumber,
        sessionIndexInWeek: session.sessionIndexInWeek,
        sessionDate: session.sessionDate ? sessionDateKey(session.sessionDate) : null,
        lessonPeriod: session.lessonPeriod,
      })),
    preparatoryDayPlans: course.preparatoryDayPlans,
    attendancePolicy: course.attendancePolicy ?? DEFAULT_ATTENDANCE_POLICY,
    members: course.members,
    attendanceSessions: undefined,
  };
}

function auditSnapshot(course: {
  id: string;
  name: string;
  code: string;
  schoolLat: number;
  schoolLng: number;
  allowedRadiusMeters: number;
  allowedIpRanges: string[];
  weeklySessionCount: number;
  totalWeeks: number;
  attendanceMode: "STANDARD" | "PREPARATORY";
  mandatoryAlertLimit: number | null;
}) {
  return {
    id: course.id,
    name: course.name,
    code: course.code,
    schoolLat: course.schoolLat,
    schoolLng: course.schoolLng,
    allowedRadiusMeters: course.allowedRadiusMeters,
    allowedIpRanges: course.allowedIpRanges,
    weeklySessionCount: course.weeklySessionCount,
    totalWeeks: course.totalWeeks,
    attendanceMode: course.attendanceMode,
    mandatoryAlertLimit: course.mandatoryAlertLimit,
  };
}

async function findOwnedCourse(teacherId: string, courseId: string) {
  return prisma.course.findFirst({
    where: { id: courseId, ...courseAccessWhere(teacherId, "COURSE_VIEW") },
    select: courseSelect,
  });
}

export async function listTeacherCourses(teacherId: string) {
  const courses = await prisma.course.findMany({
    where: courseAccessWhere(teacherId, "COURSE_VIEW"),
    orderBy: { createdAt: "desc" },
    select: courseSelect,
  });

  return courses.map((course) => serializeCourse(course));
}

export async function getTeacherCourse(teacherId: string, courseId: string) {
  const course = await findOwnedCourse(teacherId, courseId);
  if (!course) {
    throw new ApiError(404, "COURSE_NOT_FOUND", "Ders bulunamadı.");
  }

  return serializeCourse(course)!;
}

export async function createTeacherCourse(
  teacherId: string,
  input: CreateCourseInput,
  context: RequestContext,
) {
  const { preparatoryDayPlans, attendancePolicy, ...courseInput } = input;
  const derivedWeeklySessionCount = input.attendanceMode === "PREPARATORY"
    ? preparatoryDayPlans.reduce((total, plan) => total + plan.lessonCount, 0)
    : input.weeklySessionCount;
  const effectiveAttendancePolicy: AttendancePolicy = attendancePolicy ?? {
    ...DEFAULT_ATTENDANCE_POLICY,
    networkMode: courseInput.allowedIpRanges.length > 0 ? "REQUIRED" : "DISABLED",
  };
  const course = await prisma.$transaction(async (tx) => {
    const created = await tx.course.create({
      data: {
        ...courseInput,
        weeklySessionCount: derivedWeeklySessionCount,
        preparatoryDayPlans: input.attendanceMode === "PREPARATORY"
          ? { create: preparatoryDayPlans }
          : undefined,
        mandatoryAlertLimit: input.mandatoryAlertLimit ?? null,
        teacherId,
        members: { create: { userId: teacherId, role: "OWNER" } },
        attendancePolicy: { create: effectiveAttendancePolicy },
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: teacherId,
        action: "COURSE_CREATED",
        entityType: "Course",
        entityId: created.id,
        after: auditSnapshot(created),
        ...context,
      },
    });

    return created;
  });

  return getTeacherCourse(teacherId, course.id);
}

export async function updateTeacherCourse(
  teacherId: string,
  courseId: string,
  input: UpdateCourseInput,
  context: RequestContext,
) {
  await prisma.$transaction(async (tx) => {
    const current = await tx.course.findFirst({
      where: { id: courseId, ...courseAccessWhere(teacherId, "COURSE_MANAGE") },
      include: {
        _count: { select: { attendanceSessions: true } },
        preparatoryDayPlans: { select: { weekday: true, lessonCount: true } },
      },
    });
    if (!current) {
      throw new ApiError(404, "COURSE_NOT_FOUND", "Ders bulunamadı.");
    }

    const nextAttendanceMode = input.attendanceMode ?? current.attendanceMode;
    const nextPlans = input.preparatoryDayPlans ?? current.preparatoryDayPlans;
    if (nextAttendanceMode === "PREPARATORY" && nextPlans.length !== 5) {
      throw new ApiError(
        400,
        "PREPARATORY_DAY_PLANS_REQUIRED",
        "Hazırlık sınıfı için hafta içindeki her güne ait ders sayısını belirleyin.",
      );
    }
    const nextWeeklySessionCount = nextAttendanceMode === "PREPARATORY"
      ? nextPlans.reduce((total, plan) => total + plan.lessonCount, 0)
      : input.weeklySessionCount ?? current.weeklySessionCount;

    if (
      input.attendanceMode !== undefined &&
      input.attendanceMode !== current.attendanceMode &&
      current._count.attendanceSessions > 0
    ) {
      throw new ApiError(
        409,
        "COURSE_ATTENDANCE_MODE_LOCKED",
        "Yoklama geçmişi bulunan bir dersin sınıf türü değiştirilemez.",
      );
    }
    if (nextAttendanceMode === "PREPARATORY") {
      const preparatorySessions = await tx.attendanceSession.findMany({
        where: { courseId, slotType: "CALENDAR_PERIOD" },
        select: { sessionDate: true, lessonPeriod: true },
      });
      const planByWeekday = new Map(nextPlans.map((plan) => [plan.weekday, plan.lessonCount]));
      const outOfRangeSession = preparatorySessions.find((session) =>
        session.sessionDate && session.lessonPeriod &&
        session.lessonPeriod > (planByWeekday.get(weekdayForSessionDate(session.sessionDate)) ?? 0),
      );
      if (outOfRangeSession) {
        throw new ApiError(
          409,
          "PREPARATORY_DAY_PLAN_TOO_LOW",
          "Günlük ders sayısı, o güne ait geçmiş yoklamalarda kullanılan ders sırasından küçük olamaz.",
        );
      }
    }

    const courseUpdate = { ...input };
    delete courseUpdate.preparatoryDayPlans;
    delete courseUpdate.attendancePolicy;
    const updated = await tx.course.update({
      where: { id: courseId },
      data: {
        ...courseUpdate,
        weeklySessionCount: nextWeeklySessionCount,
        preparatoryDayPlans: nextAttendanceMode === "PREPARATORY"
          ? {
              deleteMany: {},
              create: nextPlans,
            }
          : { deleteMany: {} },
        attendancePolicy: input.attendancePolicy
          ? { upsert: { create: input.attendancePolicy, update: input.attendancePolicy } }
          : undefined,
      },
    });

    const activeSessionSettings = {
      ...(input.schoolLat !== undefined ? { schoolLat: input.schoolLat } : {}),
      ...(input.schoolLng !== undefined ? { schoolLng: input.schoolLng } : {}),
      ...(input.allowedRadiusMeters !== undefined
        ? { allowedRadiusMeters: input.allowedRadiusMeters }
        : {}),
      ...(input.allowedIpRanges !== undefined
        ? { allowedIpRanges: input.allowedIpRanges }
        : {}),
      ...(input.attendancePolicy !== undefined
        ? { policySnapshot: input.attendancePolicy }
        : {}),
    };

    if (Object.keys(activeSessionSettings).length > 0) {
      await tx.attendanceSession.updateMany({
        where: { courseId, status: "ACTIVE" },
        data: activeSessionSettings,
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: teacherId,
        action: "COURSE_UPDATED",
        entityType: "Course",
        entityId: courseId,
        before: auditSnapshot(current),
        after: auditSnapshot(updated),
        ...context,
      },
    });
  });

  return getTeacherCourse(teacherId, courseId);
}

export async function deleteTeacherCourse(
  teacherId: string,
  courseId: string,
  context: RequestContext,
) {
  await prisma.$transaction(async (tx) => {
    const current = await tx.course.findFirst({
      where: { id: courseId, ...courseAccessWhere(teacherId, "COURSE_MANAGE") },
      include: {
        _count: { select: { attendanceSessions: true, enrollments: true } },
      },
    });
    if (!current) {
      throw new ApiError(404, "COURSE_NOT_FOUND", "Ders bulunamadı.");
    }

    const activeSession = await tx.attendanceSession.findFirst({
      where: { courseId, status: "ACTIVE" },
      select: { id: true },
    });
    if (activeSession) {
      throw new ApiError(409, "COURSE_HAS_ACTIVE_SESSION", "Dersi arşivlemeden önce aktif yoklamayı kapatın.");
    }

    await tx.auditLog.create({
      data: {
        actorId: teacherId,
        action: "COURSE_ARCHIVED",
        entityType: "Course",
        entityId: courseId,
        before: {
          ...auditSnapshot(current),
          deletedAttendanceSessionCount: current._count.attendanceSessions,
          deletedEnrollmentCount: current._count.enrollments,
          archived: true,
        },
        ...context,
      },
    });
    await tx.course.update({ where: { id: courseId }, data: { archivedAt: new Date() } });
  });
}
