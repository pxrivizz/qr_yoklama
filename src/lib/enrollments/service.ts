import "server-only";

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http/api-error";
import type { RequestContext } from "@/lib/http/request-context";

import type { ParsedEnrollmentRow } from "./excel-parser";
import { normalizePersonName } from "@/lib/students/name";

export type EnrollmentPreviewRow = ParsedEnrollmentRow & {
  action: "CREATE" | "UPDATE" | "ERROR";
};

async function assertOwnedCourse(teacherId: string, courseId: string) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, teacherId },
    select: { id: true, name: true },
  });
  if (!course) {
    throw new ApiError(404, "COURSE_NOT_FOUND", "Ders bulunamadı.");
  }
  return course;
}

export async function previewEnrollments(
  teacherId: string,
  courseId: string,
  rows: ParsedEnrollmentRow[],
) {
  await assertOwnedCourse(teacherId, courseId);
  const existing = await prisma.enrollment.findMany({
    where: {
      courseId,
      schoolNumberOnList: { in: rows.map((row) => row.schoolNumber).filter(Boolean) },
    },
    select: { schoolNumberOnList: true },
  });
  const existingNumbers = new Set(existing.map((row) => row.schoolNumberOnList));
  const previewRows: EnrollmentPreviewRow[] = rows.map((row) => ({
    ...row,
    action:
      row.errors.length > 0
        ? "ERROR"
        : existingNumbers.has(row.schoolNumber)
          ? "UPDATE"
          : "CREATE",
  }));

  const validRows = previewRows.filter((row) => row.action !== "ERROR");
  const mandatoryCount = validRows.filter((row) => row.isMandatory).length;
  const optionalCount = validRows.length - mandatoryCount;

  return {
    rows: previewRows,
    summary: {
      total: previewRows.length,
      valid: validRows.length,
      invalid: previewRows.filter((row) => row.action === "ERROR").length,
      create: previewRows.filter((row) => row.action === "CREATE").length,
      update: previewRows.filter((row) => row.action === "UPDATE").length,
      mandatoryCount,
      optionalCount,
    },
  };
}

export async function importEnrollments(
  teacherId: string,
  courseId: string,
  rows: ParsedEnrollmentRow[],
  context: RequestContext,
) {
  const preview = await previewEnrollments(teacherId, courseId, rows);
  if (preview.summary.invalid > 0) {
    throw new ApiError(
      422,
      "INVALID_ENROLLMENT_ROWS",
      "Hatalı satırlar düzeltilmeden öğrenci listesi kaydedilemez.",
    );
  }

  await prisma.$transaction(
    async (tx) => {
      const ownedCourse = await tx.course.findFirst({
        where: { id: courseId, teacherId },
        select: { id: true },
      });
      if (!ownedCourse) {
        throw new ApiError(404, "COURSE_NOT_FOUND", "Ders bulunamadı.");
      }

      const schoolNumbers = rows.map((row) => row.schoolNumber);
      const [existingEnrollments, studentCandidates] = await Promise.all([
        tx.enrollment.findMany({
          where: { courseId, schoolNumberOnList: { in: schoolNumbers } },
          select: { schoolNumberOnList: true, matchedUserId: true },
        }),
        tx.user.findMany({
          where: { role: "STUDENT", schoolNumber: { in: schoolNumbers } },
          select: { id: true, schoolNumber: true, normalizedName: true },
        }),
      ]);
      const existingByNumber = new Map(
        existingEnrollments.map((enrollment) => [enrollment.schoolNumberOnList, enrollment]),
      );
      const studentsByIdentity = new Map<string, typeof studentCandidates>();
      for (const student of studentCandidates) {
        if (!student.schoolNumber || !student.normalizedName) continue;
        const key = `${student.schoolNumber}\u0000${student.normalizedName}`;
        const candidates = studentsByIdentity.get(key) ?? [];
        candidates.push(student);
        studentsByIdentity.set(key, candidates);
      }

      for (const row of rows) {
        const existingEnrollment = existingByNumber.get(row.schoolNumber);
        const candidates = studentsByIdentity.get(
          `${row.schoolNumber}\u0000${row.normalizedName}`,
        );
        const matchedStudent = candidates?.length === 1 ? candidates[0] : undefined;
        const shouldAutoMatch = !existingEnrollment?.matchedUserId && matchedStudent;
        const enrollment = await tx.enrollment.upsert({
          where: {
            courseId_schoolNumberOnList: {
              courseId,
              schoolNumberOnList: row.schoolNumber,
            },
          },
          create: {
            courseId,
            fullNameOnList: row.fullName,
            normalizedNameOnList: row.normalizedName,
            schoolNumberOnList: row.schoolNumber,
            isMandatory: row.isMandatory,
            matchedUserId: matchedStudent?.id,
            matchedAt: matchedStudent ? new Date() : undefined,
          },
          update: {
            fullNameOnList: row.fullName,
            normalizedNameOnList: row.normalizedName,
            isMandatory: row.isMandatory,
            matchedUserId: shouldAutoMatch ? matchedStudent.id : undefined,
            matchedAt: shouldAutoMatch ? new Date() : undefined,
          },
          select: { id: true, matchedUserId: true },
        });
        if (enrollment.matchedUserId) {
          await tx.attendanceRecord.updateMany({
            where: { enrollmentId: enrollment.id, studentId: null },
            data: { studentId: enrollment.matchedUserId },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          actorId: teacherId,
          action: "ENROLLMENTS_IMPORTED",
          entityType: "Course",
          entityId: courseId,
          after: {
            total: preview.summary.total,
            created: preview.summary.create,
            updated: preview.summary.update,
          },
          ...context,
        },
      });
    },
    { timeout: 20_000 },
  );

  return preview.summary;
}

export type CourseStudentItem = {
  id: string;
  fullName: string;
  schoolNumber: string;
  isMandatory: boolean;
  createdAt: Date;
  matchedUserId: string | null;
  matchedAt: Date | null;
  matchedUser: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    schoolNumber: string | null;
  } | null;
  stats: {
    totalSessions: number;
    attendedCount: number;
    absentCount: number;
    attendanceRate: number;
    isFailed: boolean;
    isAtLimit: boolean;
    isNearLimit: boolean;
  };
};

export type CourseStudentsData = {
  course: {
    id: string;
    name: string;
    code: string;
    mandatoryAlertLimit: number | null;
    weeklySessionCount: number;
    totalWeeks: number;
    totalClosedSessions: number;
  };
  students: CourseStudentItem[];
  summary: {
    totalStudents: number;
    mandatoryCount: number;
    optionalCount: number;
    matchedCount: number;
    unmatchedCount: number;
    alertCount: number;
  };
};

export async function getCourseStudents(
  teacherId: string,
  courseId: string,
): Promise<CourseStudentsData> {
  const course = await prisma.course.findFirst({
    where: { id: courseId, teacherId },
    select: {
      id: true,
      name: true,
      code: true,
      mandatoryAlertLimit: true,
      weeklySessionCount: true,
      totalWeeks: true,
      attendanceSessions: {
        where: { status: "CLOSED" },
        select: { id: true },
      },
      enrollments: {
        orderBy: [{ fullNameOnList: "asc" }],
        select: {
          id: true,
          fullNameOnList: true,
          schoolNumberOnList: true,
          isMandatory: true,
          matchedUserId: true,
          matchedAt: true,
          createdAt: true,
          matchedUser: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              schoolNumber: true,
            },
          },
          attendanceRecords: {
            where: { session: { status: "CLOSED" } },
            select: { status: true },
          },
        },
      },
    },
  });

  if (!course) {
    throw new ApiError(404, "COURSE_NOT_FOUND", "Ders bulunamadı.");
  }

  const totalClosedSessions = course.attendanceSessions.length;

  const students: CourseStudentItem[] = course.enrollments.map((enrollment) => {
    const attendedCount = enrollment.attendanceRecords.filter(
      (r) => r.status === "PRESENT",
    ).length;
    const absentCount = Math.max(0, totalClosedSessions - attendedCount);
    const attendanceRate =
      totalClosedSessions > 0
        ? Math.round((attendedCount / totalClosedSessions) * 100)
        : 100;
    const limit = course.mandatoryAlertLimit;
    const hasLimit = enrollment.isMandatory && limit !== null && limit > 0;
    const isFailed = hasLimit && absentCount > limit;
    const isAtLimit = hasLimit && absentCount === limit;
    const isNearLimit = hasLimit && absentCount === limit - 1;

    return {
      id: enrollment.id,
      fullName: enrollment.fullNameOnList,
      schoolNumber: enrollment.schoolNumberOnList,
      isMandatory: enrollment.isMandatory,
      createdAt: enrollment.createdAt,
      matchedUserId: enrollment.matchedUserId,
      matchedAt: enrollment.matchedAt,
      matchedUser: enrollment.matchedUser,
      stats: {
        totalSessions: totalClosedSessions,
        attendedCount,
        absentCount,
        attendanceRate,
        isFailed,
        isAtLimit,
        isNearLimit,
      },
    };
  });

  const summary = {
    totalStudents: students.length,
    mandatoryCount: students.filter((s) => s.isMandatory).length,
    optionalCount: students.filter((s) => !s.isMandatory).length,
    matchedCount: students.filter((s) => Boolean(s.matchedUserId)).length,
    unmatchedCount: students.filter((s) => !s.matchedUserId).length,
    alertCount: students.filter(
      (student) =>
        student.stats.isFailed || student.stats.isAtLimit || student.stats.isNearLimit,
    ).length,
  };

  return {
    course: {
      id: course.id,
      name: course.name,
      code: course.code,
      mandatoryAlertLimit: course.mandatoryAlertLimit,
      weeklySessionCount: course.weeklySessionCount,
      totalWeeks: course.totalWeeks,
      totalClosedSessions,
    },
    students,
    summary,
  };
}

export async function addCourseStudent(
  teacherId: string,
  courseId: string,
  data: {
    fullName: string;
    schoolNumber: string;
    isMandatory: boolean;
  },
  context: RequestContext,
) {
  await assertOwnedCourse(teacherId, courseId);

  const fullName = data.fullName.trim();
  const schoolNumber = data.schoolNumber.trim();
  const isMandatory = Boolean(data.isMandatory);

  if (!fullName || !schoolNumber) {
    throw new ApiError(400, "INVALID_STUDENT_DATA", "Ad Soyad ve Öğrenci Numarası zorunludur.");
  }

  const existing = await prisma.enrollment.findUnique({
    where: {
      courseId_schoolNumberOnList: {
        courseId,
        schoolNumberOnList: schoolNumber,
      },
    },
  });

  if (existing) {
    throw new ApiError(409, "ENROLLMENT_ALREADY_EXISTS", "Bu öğrenci numarası zaten derste kayıtlı.");
  }

  const normalizedName = normalizePersonName(fullName);

  const studentCandidates = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      schoolNumber,
    },
    select: { id: true, schoolNumber: true, normalizedName: true },
  });

  const exactCandidates = studentCandidates.filter(
    (candidate) => candidate.normalizedName === normalizedName,
  );
  const matchedStudent = exactCandidates.length === 1 ? exactCandidates[0] : undefined;

  const created = await prisma.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.create({
      data: {
        courseId,
        fullNameOnList: fullName,
        normalizedNameOnList: normalizedName,
        schoolNumberOnList: schoolNumber,
        isMandatory,
        matchedUserId: matchedStudent?.id ?? null,
        matchedAt: matchedStudent ? new Date() : null,
      },
      include: {
        matchedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            schoolNumber: true,
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: teacherId,
        action: "ENROLLMENT_CREATED",
        entityType: "Enrollment",
        entityId: enrollment.id,
        after: {
          courseId,
          fullName,
          schoolNumber,
          isMandatory,
          matchedUserId: enrollment.matchedUserId,
        },
        ...context,
      },
    });

    return enrollment;
  });

  return created;
}

export async function updateCourseStudent(
  teacherId: string,
  courseId: string,
  enrollmentId: string,
  data: {
    fullName?: string;
    schoolNumber?: string;
    isMandatory?: boolean;
  },
  context: RequestContext,
) {
  await assertOwnedCourse(teacherId, courseId);

  const current = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, courseId },
  });

  if (!current) {
    throw new ApiError(404, "ENROLLMENT_NOT_FOUND", "Öğrenci kaydı bulunamadı.");
  }

  const newFullName =
    data.fullName !== undefined ? data.fullName.trim() : current.fullNameOnList;
  const newSchoolNumber =
    data.schoolNumber !== undefined ? data.schoolNumber.trim() : current.schoolNumberOnList;
  const newIsMandatory =
    data.isMandatory !== undefined ? Boolean(data.isMandatory) : current.isMandatory;

  if (!newFullName || !newSchoolNumber) {
    throw new ApiError(400, "INVALID_STUDENT_DATA", "Ad Soyad ve Öğrenci Numarası boş bırakılamaz.");
  }

  if (newSchoolNumber !== current.schoolNumberOnList) {
    const duplicate = await prisma.enrollment.findUnique({
      where: {
        courseId_schoolNumberOnList: {
          courseId,
          schoolNumberOnList: newSchoolNumber,
        },
      },
    });
    if (duplicate) {
      throw new ApiError(409, "ENROLLMENT_ALREADY_EXISTS", "Bu öğrenci numarası zaten derste kayıtlı.");
    }
  }

  const normalizedName = normalizePersonName(newFullName);

  let matchedUserId = current.matchedUserId;
  let matchedAt = current.matchedAt;

  if (
    newSchoolNumber !== current.schoolNumberOnList ||
    newFullName !== current.fullNameOnList
  ) {
    const studentCandidates = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        schoolNumber: newSchoolNumber,
      },
      select: { id: true, schoolNumber: true, normalizedName: true },
    });
    const exactCandidates = studentCandidates.filter(
      (candidate) => candidate.normalizedName === normalizedName,
    );
    const candidate = exactCandidates.length === 1 ? exactCandidates[0] : undefined;
    if (candidate) {
      matchedUserId = candidate.id;
      matchedAt = new Date();
    } else {
      matchedUserId = null;
      matchedAt = null;
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.update({
      where: { id: enrollmentId },
      data: {
        fullNameOnList: newFullName,
        normalizedNameOnList: normalizedName,
        schoolNumberOnList: newSchoolNumber,
        isMandatory: newIsMandatory,
        matchedUserId,
        matchedAt,
      },
      include: {
        matchedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            schoolNumber: true,
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: teacherId,
        action: "ENROLLMENT_UPDATED",
        entityType: "Enrollment",
        entityId: enrollmentId,
        before: {
          fullName: current.fullNameOnList,
          schoolNumber: current.schoolNumberOnList,
          isMandatory: current.isMandatory,
        },
        after: {
          fullName: newFullName,
          schoolNumber: newSchoolNumber,
          isMandatory: newIsMandatory,
        },
        ...context,
      },
    });

    return enrollment;
  });

  return updated;
}

export async function deleteCourseStudent(
  teacherId: string,
  courseId: string,
  enrollmentId: string,
  context: RequestContext,
) {
  await assertOwnedCourse(teacherId, courseId);

  const current = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, courseId },
    select: { id: true, fullNameOnList: true, schoolNumberOnList: true },
  });

  if (!current) {
    throw new ApiError(404, "ENROLLMENT_NOT_FOUND", "Öğrenci kaydı bulunamadı.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.attendanceAttempt.deleteMany({ where: { enrollmentId } });
    await tx.qrScanLog.deleteMany({ where: { enrollmentId } });
    await tx.attendanceRecord.deleteMany({ where: { enrollmentId } });
    await tx.enrollment.delete({ where: { id: enrollmentId } });

    await tx.auditLog.create({
      data: {
        actorId: teacherId,
        action: "ENROLLMENT_DELETED",
        entityType: "Enrollment",
        entityId: enrollmentId,
        before: {
          fullName: current.fullNameOnList,
          schoolNumber: current.schoolNumberOnList,
        },
        ...context,
      },
    });
  });

  return { success: true };
}
