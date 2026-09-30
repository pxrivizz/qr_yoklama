import "server-only";

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http/api-error";
import type { RequestContext } from "@/lib/http/request-context";
import { calculatePlannedSessionCount } from "@/lib/attendance/schedule";
import { sessionDateKey, weekdayForSessionDate } from "@/lib/attendance/slot";

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
      enrollments: true,
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
} as const;

function serializeCourse(course: Awaited<ReturnType<typeof findOwnedCourse>>) {
  if (!course) return null;

  return {
    ...course,
    plannedSessionCount: calculatePlannedSessionCount(
      course.weeklySessionCount,
      course.totalWeeks,
    ),
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
    where: { id: courseId, teacherId },
    select: courseSelect,
  });
}

export async function listTeacherCourses(teacherId: string) {
  const courses = await prisma.course.findMany({
    where: { teacherId },
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
  const { preparatoryDayPlans, ...courseInput } = input;
  const derivedWeeklySessionCount = input.attendanceMode === "PREPARATORY"
    ? preparatoryDayPlans.reduce((total, plan) => total + plan.lessonCount, 0)
    : input.weeklySessionCount;
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
      where: { id: courseId, teacherId },
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
      where: { id: courseId, teacherId },
      include: { _count: { select: { attendanceSessions: true } } },
    });
    if (!current) {
      throw new ApiError(404, "COURSE_NOT_FOUND", "Ders bulunamadı.");
    }

    if (current._count.attendanceSessions > 0) {
      throw new ApiError(
        409,
        "COURSE_HAS_ATTENDANCE",
        "Geçmiş yoklama kaydı olan ders silinemez.",
      );
    }

    await tx.auditLog.create({
      data: {
        actorId: teacherId,
        action: "COURSE_DELETED",
        entityType: "Course",
        entityId: courseId,
        before: auditSnapshot(current),
        ...context,
      },
    });
    await tx.course.delete({ where: { id: courseId } });
  });
}
