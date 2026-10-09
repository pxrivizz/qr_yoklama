import "server-only";

import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { ApiError } from "@/lib/http/api-error";
import type { RequestContext } from "@/lib/http/request-context";
import type { CreateAdminInput, CreateTeacherInput } from "@/lib/auth/account-schema";

export async function getAdminDashboardOverview() {
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    teacherCount,
    studentCount,
    courseCount,
    enrollmentCount,
    linkedEnrollmentCount,
    activeSessionCount,
    recentAttendanceCount,
    recentActivity,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "TEACHER" } }),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.course.count(),
    prisma.enrollment.count(),
    prisma.enrollment.count({ where: { matchedUserId: { not: null } } }),
    prisma.attendanceSession.count({ where: { status: "ACTIVE" } }),
    prisma.attendanceRecord.count({ where: { recordedAt: { gte: last24Hours } } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        action: true,
        entityType: true,
        createdAt: true,
        actor: { select: { name: true, email: true } },
      },
    }),
  ]);

  return {
    teacherCount,
    studentCount,
    courseCount,
    enrollmentCount,
    linkedEnrollmentCount,
    activeSessionCount,
    recentAttendanceCount,
    recentActivity,
  };
}

export async function listTeachers() {
  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER" },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      passwordHash: true,
      _count: { select: { taughtCourses: true } },
    },
  });
  return teachers.map(({ passwordHash, ...teacher }) => ({
    ...teacher,
    hasPassword: Boolean(passwordHash),
  }));
}

export async function listAdmins() {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      passwordHash: true,
    },
  });

  return admins.map(({ passwordHash, ...admin }) => ({
    ...admin,
    hasPassword: Boolean(passwordHash),
  }));
}

export async function createAdmin(
  actorAdminId: string,
  input: CreateAdminInput,
  context: RequestContext,
) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ApiError(409, "EMAIL_ALREADY_EXISTS", "Bu e-posta adresi zaten kullanılıyor.");
  }

  const passwordHash = await hashPassword(input.temporaryPassword);
  return prisma.$transaction(async (tx) => {
    const admin = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        role: "ADMIN",
        emailVerified: new Date(),
        passwordHash,
        passwordChangedAt: new Date(),
      },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    await tx.auditLog.create({
      data: {
        actorId: actorAdminId,
        action: "ADMIN_CREATED",
        entityType: "User",
        entityId: admin.id,
        after: { name: admin.name, email: admin.email, role: "ADMIN" },
        ...context,
      },
    });

    return admin;
  });
}

export async function createTeacher(
  adminId: string,
  input: CreateTeacherInput,
  context: RequestContext,
) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ApiError(409, "EMAIL_ALREADY_EXISTS", "Bu e-posta adresi zaten kullanılıyor.");
  }

  const passwordHash = await hashPassword(input.temporaryPassword);
  return prisma.$transaction(async (tx) => {
    const teacher = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        role: "TEACHER",
        emailVerified: new Date(),
        passwordHash,
        passwordChangedAt: new Date(),
      },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "TEACHER_CREATED",
        entityType: "User",
        entityId: teacher.id,
        after: { name: teacher.name, email: teacher.email, role: "TEACHER" },
        ...context,
      },
    });
    return teacher;
  });
}

export async function resetTeacherPassword(
  adminId: string,
  teacherId: string,
  temporaryPassword: string,
  context: RequestContext,
) {
  const teacher = await prisma.user.findFirst({
    where: { id: teacherId, role: "TEACHER" },
    select: { id: true, email: true },
  });
  if (!teacher) throw new ApiError(404, "TEACHER_NOT_FOUND", "Öğretmen bulunamadı.");

  const passwordHash = await hashPassword(temporaryPassword);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: teacherId },
      data: { passwordHash, passwordChangedAt: new Date(), authVersion: { increment: 1 } },
    });
    await tx.session.deleteMany({ where: { userId: teacherId } });
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "TEACHER_PASSWORD_RESET",
        entityType: "User",
        entityId: teacherId,
        after: { email: teacher.email },
        ...context,
      },
    });
  });
}

export async function deleteTeacher(
  adminId: string,
  teacherId: string,
  confirmationEmail: string,
  context: RequestContext,
) {
  const teacher = await prisma.user.findFirst({
    where: { id: teacherId, role: "TEACHER" },
    select: {
      id: true,
      email: true,
      name: true,
      taughtCourses: {
        select: {
          id: true,
          enrollments: { select: { id: true } },
        },
      },
    },
  });
  if (!teacher) throw new ApiError(404, "TEACHER_NOT_FOUND", "Öğretmen bulunamadı.");
  if (teacher.email.toLowerCase() !== confirmationEmail) {
    throw new ApiError(422, "CONFIRMATION_MISMATCH", "Onay e-postası öğretmen hesabıyla eşleşmiyor.");
  }

  const courseIds = teacher.taughtCourses.map((course) => course.id);
  const enrollmentIds = teacher.taughtCourses.flatMap((course) =>
    course.enrollments.map((enrollment) => enrollment.id),
  );

  await prisma.$transaction(async (tx) => {
    const sessionIds = courseIds.length
      ? (await tx.attendanceSession.findMany({
          where: { courseId: { in: courseIds } },
          select: { id: true },
        })).map((session) => session.id)
      : [];

    await tx.notification.deleteMany({
      where: { OR: [{ userId: teacherId }, { courseId: { in: courseIds } }] },
    });
    await tx.qrScanLog.deleteMany({
      where: { OR: [{ userId: teacherId }, { courseId: { in: courseIds } }] },
    });
    await tx.attendanceAttempt.updateMany({
      where: {
        OR: [
          { sessionId: { in: sessionIds } },
          { enrollmentId: { in: enrollmentIds } },
          { studentId: teacherId },
        ],
      },
      data: { sessionId: null, enrollmentId: null, studentId: null },
    });
    await tx.attendanceSession.deleteMany({ where: { courseId: { in: courseIds } } });
    await tx.enrollment.deleteMany({ where: { courseId: { in: courseIds } } });
    await tx.course.deleteMany({ where: { id: { in: courseIds } } });
    await tx.bugReport.deleteMany({ where: { reporterId: teacherId } });
    await tx.user.delete({ where: { id: teacherId } });
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "TEACHER_DELETED",
        entityType: "User",
        entityId: teacherId,
        before: {
          name: teacher.name,
          email: teacher.email,
          courseCount: courseIds.length,
          enrollmentCount: enrollmentIds.length,
        },
        ...context,
      },
    });
  });
}
