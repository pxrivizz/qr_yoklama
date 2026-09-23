import "server-only";

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http/api-error";
import type { RequestContext } from "@/lib/http/request-context";

import { normalizePersonName } from "./name";

const MAX_STUDENT_PHOTO_BYTES = 2 * 1024 * 1024;

function assertSafeStudentPhoto(image: string) {
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
  if (!match) {
    throw new ApiError(422, "INVALID_PHOTO", "Fotoğraf JPEG, PNG veya WebP biçiminde olmalıdır.");
  }

  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0 || bytes.length > MAX_STUDENT_PHOTO_BYTES) {
    throw new ApiError(413, "PHOTO_TOO_LARGE", "Fotoğraf boyutu en fazla 2 MB olabilir.");
  }

  const mime = match[1];
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng =
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp =
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if ((mime === "jpeg" && !isJpeg) || (mime === "png" && !isPng) || (mime === "webp" && !isWebp)) {
    throw new ApiError(422, "INVALID_PHOTO", "Fotoğraf içeriği belirtilen dosya biçimiyle eşleşmiyor.");
  }
}

export type StudentCourseItem = {
  id: string;
  isMandatory: boolean;
  course: {
    id: string;
    code: string;
    name: string;
    mandatoryAlertLimit: number | null;
  };
  totalClosedSessions: number;
  attendedCount: number;
  absentCount: number;
  attendanceRate: number;
  isFailed: boolean;
  isAtLimit: boolean;
  isNearLimit: boolean;
  _count: {
    attendanceRecords: number;
  };
};

export async function listStudentCourses(studentId: string): Promise<StudentCourseItem[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: { matchedUserId: studentId },
    orderBy: { course: { code: "asc" } },
    select: {
      id: true,
      isMandatory: true,
      course: {
        select: {
          id: true,
          code: true,
          name: true,
          mandatoryAlertLimit: true,
          _count: {
            select: {
              attendanceSessions: { where: { status: "CLOSED" } },
            },
          },
        },
      },
      attendanceRecords: {
        where: {
          session: { status: "CLOSED" },
        },
        select: {
          status: true,
        },
      },
    },
  });

  return enrollments.map((enrollment) => {
    const totalClosedSessions = enrollment.course._count.attendanceSessions;
    const attendedCount = enrollment.attendanceRecords.filter(
      (r) => r.status === "PRESENT",
    ).length;
    const absentCount = Math.max(0, totalClosedSessions - attendedCount);
    const limit = enrollment.course.mandatoryAlertLimit;
    const hasLimit = enrollment.isMandatory && limit !== null && limit > 0;
    const isFailed = hasLimit && absentCount > limit;
    const isAtLimit = hasLimit && absentCount === limit;
    const isNearLimit = hasLimit && absentCount === limit - 1;
    const attendanceRate =
      totalClosedSessions > 0 ? Math.round((attendedCount / totalClosedSessions) * 100) : 100;

    return {
      id: enrollment.id,
      isMandatory: enrollment.isMandatory,
      course: {
        id: enrollment.course.id,
        code: enrollment.course.code,
        name: enrollment.course.name,
        mandatoryAlertLimit: limit,
      },
      totalClosedSessions,
      attendedCount,
      absentCount,
      attendanceRate,
      isFailed,
      isAtLimit,
      isNearLimit,
      _count: {
        attendanceRecords: attendedCount,
      },
    };
  });
}

export async function matchStudentEnrollments(
  studentId: string,
  schoolNumber: string,
  context: RequestContext,
) {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, role: true, name: true },
  });
  if (!student || student.role !== "STUDENT") {
    throw new ApiError(403, "STUDENT_REQUIRED", "Bu işlem yalnızca öğrenciler içindir.");
  }
  if (!student.name) {
    throw new ApiError(
      422,
      "STUDENT_NAME_REQUIRED",
      "Hesabınızda ad soyad bilgisi bulunamadı. Okul hesabınızın profilini güncelleyip tekrar deneyin.",
    );
  }

  const normalizedName = normalizePersonName(student.name);
  const numberMatches = await prisma.enrollment.findMany({
    where: { schoolNumberOnList: schoolNumber },
    select: {
      id: true,
      normalizedNameOnList: true,
      matchedUserId: true,
      course: { select: { code: true, name: true } },
    },
  });
  const exactMatches = numberMatches.filter(
    (enrollment) => enrollment.normalizedNameOnList === normalizedName,
  );

  if (exactMatches.length === 0) {
    throw new ApiError(
      404,
      numberMatches.length > 0 ? "STUDENT_NAME_MISMATCH" : "STUDENT_NOT_ON_LIST",
      numberMatches.length > 0
        ? "Öğrenci numarası bulundu ancak hesaptaki ad soyad listeyle eşleşmiyor. Öğretmeninizden kaydı kontrol etmesini isteyin."
        : "Bu öğrenci numarasıyla bir ders kaydı bulunamadı. Numarayı kontrol edin veya öğretmeninizle iletişime geçin.",
    );
  }

  const conflicting = exactMatches.find(
    (enrollment) => enrollment.matchedUserId && enrollment.matchedUserId !== studentId,
  );
  if (conflicting) {
    throw new ApiError(
      409,
      "ENROLLMENT_ALREADY_MATCHED",
      "Bu öğrenci kaydı başka bir hesapla eşleştirilmiş. Öğretmeninizle iletişime geçin.",
    );
  }

  const enrollmentIds = exactMatches.map((enrollment) => enrollment.id);
  const matchedAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: studentId },
      data: { schoolNumber, normalizedName },
    });
    const matched = await tx.enrollment.updateMany({
      where: {
        id: { in: enrollmentIds },
        OR: [{ matchedUserId: null }, { matchedUserId: studentId }],
      },
      data: { matchedUserId: studentId, matchedAt },
    });
    if (matched.count !== enrollmentIds.length) {
      throw new ApiError(
        409,
        "ENROLLMENT_ALREADY_MATCHED",
        "Bu öğrenci kaydı başka bir hesapla eşleştirilmiş. Öğretmeninizle iletişime geçin.",
      );
    }
    await tx.attendanceRecord.updateMany({
      where: { enrollmentId: { in: enrollmentIds }, studentId: null },
      data: { studentId },
    });
    await tx.auditLog.create({
      data: {
        actorId: studentId,
        action: "STUDENT_ENROLLMENTS_MATCHED",
        entityType: "User",
        entityId: studentId,
        after: { schoolNumber, enrollmentCount: enrollmentIds.length },
        ...context,
      },
    });
  });

  return {
    matchedCount: enrollmentIds.length,
    courses: exactMatches.map((enrollment) => enrollment.course),
  };
}

export async function updateStudentPhoto(
  studentId: string,
  image: string,
  context: RequestContext,
) {
  assertSafeStudentPhoto(image);
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, role: true },
  });
  if (!student || student.role !== "STUDENT") {
    throw new ApiError(403, "STUDENT_REQUIRED", "Bu işlem yalnızca öğrenciler içindir.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: studentId },
      data: { image },
    });
    await tx.auditLog.create({
      data: {
        actorId: studentId,
        action: "STUDENT_PHOTO_UPDATED",
        entityType: "User",
        entityId: studentId,
        ...context,
      },
    });
  });

  return { success: true };
}
