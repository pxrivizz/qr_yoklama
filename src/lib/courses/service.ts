import "server-only";

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http/api-error";
import type { RequestContext } from "@/lib/http/request-context";
import { calculatePlannedSessionCount } from "@/lib/attendance/schedule";

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
    where: { status: "ACTIVE" as const },
    select: { id: true },
    take: 1,
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
    hasActiveSession: course.attendanceSessions.length > 0,
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
  const course = await prisma.$transaction(async (tx) => {
    const created = await tx.course.create({
      data: {
        ...input,
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
    });
    if (!current) {
      throw new ApiError(404, "COURSE_NOT_FOUND", "Ders bulunamadı.");
    }

    const updated = await tx.course.update({
      where: { id: courseId },
      data: input,
    });

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
