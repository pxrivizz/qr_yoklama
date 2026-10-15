import "server-only";

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http/api-error";
import type { RequestContext } from "@/lib/http/request-context";
import { requireCoursePermission } from "@/lib/courses/permissions";

export async function listCourseMembers(actorId: string, courseId: string) {
  await requireCoursePermission(actorId, courseId, "COURSE_VIEW");
  return prisma.courseMember.findMany({
    where: { courseId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      role: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function assignCourseMember(
  actorId: string,
  courseId: string,
  input: { email: string; role: "INSTRUCTOR" | "ASSISTANT" },
  context: RequestContext,
) {
  await requireCoursePermission(actorId, courseId, "MEMBER_MANAGE");
  const target = await prisma.user.findFirst({
    where: { email: input.email, roles: { has: "TEACHER" } },
    select: { id: true, name: true, email: true },
  });
  if (!target) {
    throw new ApiError(404, "TEACHER_NOT_FOUND", "Bu e-posta adresine ait öğretmen hesabı bulunamadı.");
  }

  return prisma.$transaction(async (tx) => {
    const member = await tx.courseMember.upsert({
      where: { courseId_userId: { courseId, userId: target.id } },
      create: { courseId, userId: target.id, role: input.role },
      update: { role: input.role },
      select: { role: true, user: { select: { id: true, name: true, email: true } } },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: "COURSE_MEMBER_ASSIGNED",
        entityType: "Course",
        entityId: courseId,
        after: { userId: target.id, email: target.email, role: input.role },
        ...context,
      },
    });
    return member;
  });
}

export async function updateCourseMember(
  actorId: string,
  courseId: string,
  userId: string,
  role: "INSTRUCTOR" | "ASSISTANT",
  context: RequestContext,
) {
  await requireCoursePermission(actorId, courseId, "MEMBER_MANAGE");
  const current = await prisma.courseMember.findUnique({
    where: { courseId_userId: { courseId, userId } },
  });
  if (!current) throw new ApiError(404, "COURSE_MEMBER_NOT_FOUND", "Ders üyesi bulunamadı.");
  if (current.role === "OWNER") {
    throw new ApiError(409, "COURSE_OWNER_IMMUTABLE", "Ders sahibi bu ekrandan değiştirilemez.");
  }
  return prisma.$transaction(async (tx) => {
    const member = await tx.courseMember.update({
      where: { courseId_userId: { courseId, userId } },
      data: { role },
      select: { role: true, user: { select: { id: true, name: true, email: true } } },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: "COURSE_MEMBER_ROLE_UPDATED",
        entityType: "Course",
        entityId: courseId,
        before: { userId, role: current.role },
        after: { userId, role },
        ...context,
      },
    });
    return member;
  });
}

export async function removeCourseMember(
  actorId: string,
  courseId: string,
  userId: string,
  context: RequestContext,
) {
  await requireCoursePermission(actorId, courseId, "MEMBER_MANAGE");
  const current = await prisma.courseMember.findUnique({
    where: { courseId_userId: { courseId, userId } },
  });
  if (!current) throw new ApiError(404, "COURSE_MEMBER_NOT_FOUND", "Ders üyesi bulunamadı.");
  if (current.role === "OWNER") {
    throw new ApiError(409, "COURSE_OWNER_IMMUTABLE", "Ders sahibi üyelikten çıkarılamaz.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.courseMember.delete({ where: { courseId_userId: { courseId, userId } } });
    await tx.auditLog.create({
      data: {
        actorId,
        action: "COURSE_MEMBER_REMOVED",
        entityType: "Course",
        entityId: courseId,
        before: { userId, role: current.role },
        ...context,
      },
    });
  });
}
