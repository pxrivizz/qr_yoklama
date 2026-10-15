import "server-only";

import type { CourseMemberRole, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http/api-error";

export type CoursePermission =
  | "COURSE_VIEW"
  | "COURSE_MANAGE"
  | "ENROLLMENT_MANAGE"
  | "ATTENDANCE_MANAGE"
  | "REPORT_VIEW"
  | "MEMBER_MANAGE";

const permissionRoles: Record<CoursePermission, readonly CourseMemberRole[]> = {
  COURSE_VIEW: ["OWNER", "INSTRUCTOR", "ASSISTANT"],
  COURSE_MANAGE: ["OWNER", "INSTRUCTOR"],
  ENROLLMENT_MANAGE: ["OWNER", "INSTRUCTOR", "ASSISTANT"],
  ATTENDANCE_MANAGE: ["OWNER", "INSTRUCTOR", "ASSISTANT"],
  REPORT_VIEW: ["OWNER", "INSTRUCTOR", "ASSISTANT"],
  MEMBER_MANAGE: ["OWNER"],
};

export function courseAccessWhere(
  userId: string,
  permission: CoursePermission,
): Prisma.CourseWhereInput {
  return {
    archivedAt: null,
    OR: [
      // teacherId remains as a compatibility owner during the membership migration.
      { teacherId: userId },
      {
        members: {
          some: {
            userId,
            role: { in: [...permissionRoles[permission]] },
          },
        },
      },
    ],
  };
}

export async function requireCoursePermission(
  userId: string,
  courseId: string,
  permission: CoursePermission,
) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, ...courseAccessWhere(userId, permission) },
    select: { id: true },
  });
  if (!course) {
    throw new ApiError(404, "COURSE_NOT_FOUND", "Ders bulunamadı veya bu işlem için yetkiniz yok.");
  }
  return course;
}

export function canAssignCourseRole(
  actorRole: CourseMemberRole,
  targetRole: CourseMemberRole,
): boolean {
  return actorRole === "OWNER" && targetRole !== "OWNER";
}
