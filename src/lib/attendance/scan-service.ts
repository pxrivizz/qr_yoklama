import "server-only";

import { prisma } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { ApiError } from "@/lib/http/api-error";
import type { RequestContext } from "@/lib/http/request-context";
import { isWithinAllowedRadius } from "@/lib/attendance/geo";
import { isIpAllowed } from "@/lib/attendance/ip";
import { verifyQrToken } from "@/lib/attendance/qr-token";
import type { AttendanceScanInput } from "@/lib/attendance/scan-schema";
import { createQrScanLog } from "@/lib/attendance/qr-log-service";

async function resolveToken(token: string) {
  let claims;
  try {
    claims = await verifyQrToken(token, getServerEnv().QR_SIGNING_SECRET);
  } catch {
    throw new ApiError(
      410,
      "QR_EXPIRED",
      "QR kodunun süresi doldu. Öğretmen ekranındaki yeni kodu tekrar okutun.",
    );
  }

  const tokenRecord = await prisma.qrToken.findUnique({
    where: { signature: token },
    include: {
      session: {
        include: { course: { select: { id: true, name: true, code: true } } },
      },
    },
  });
  if (
    !tokenRecord ||
    tokenRecord.sessionId !== claims.sessionId ||
    tokenRecord.session.status !== "ACTIVE" ||
    tokenRecord.expiresAt.getTime() < Date.now()
  ) {
    throw new ApiError(
      410,
      "QR_EXPIRED",
      "QR kodunun süresi doldu. Öğretmen ekranındaki yeni kodu tekrar okutun.",
    );
  }

  return { claims, tokenRecord };
}

export async function inspectAttendanceToken(
  token: string,
  expectedCourseId?: string,
  studentId?: string,
) {
  const { tokenRecord } = await resolveToken(token);
  if (expectedCourseId && tokenRecord.session.course.id !== expectedCourseId) {
    throw new ApiError(
      400,
      "COURSE_MISMATCH",
      "Okutulan QR kodu bu derse ait değil. Lütfen ilgili dersin QR kodunu okutun.",
    );
  }

  if (studentId) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { courseId: tokenRecord.session.course.id, matchedUserId: studentId },
      select: { id: true },
    });

    if (!enrollment) {
      throw new ApiError(
        403,
        "STUDENT_NOT_ENROLLED",
        "Bu dersin öğrenci listesinde doğrulanmış kaydınız yok. Öğretmeninizle iletişime geçin.",
      );
    }

    const existing = await prisma.attendanceRecord.findUnique({
      where: {
        sessionId_enrollmentId: {
          sessionId: tokenRecord.session.id,
          enrollmentId: enrollment.id,
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new ApiError(409, "ALREADY_RECORDED", "Bu yoklamaya zaten katıldınız.");
    }
  }

  return {
    courseId: tokenRecord.session.course.id,
    courseName: tokenRecord.session.course.name,
    courseCode: tokenRecord.session.course.code,
  };
}

export async function recordAttendanceScan(
  studentId: string,
  input: AttendanceScanInput,
  context: RequestContext,
) {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, email: true, schoolNumber: true, image: true },
  });

  let resolved;
  try {
    resolved = await resolveToken(input.token);
  } catch (error) {
    await createQrScanLog({
      courseId: input.targetCourseId ?? undefined,
      userId: studentId,
      studentName: student?.name ?? student?.email,
      studentNumber: student?.schoolNumber,
      scannedBy: student?.name ?? student?.email,
      scanSource: input.scanSource,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracyMeters: input.accuracyMeters,
      actionType: "YOKLAMA",
      result: "EXPIRED_QR",
      resultMessage: "QR kodunun süresi doldu veya kod geçersiz.",
    });
    throw error;
  }

  const { claims, tokenRecord } = resolved;
  const attendanceSession = tokenRecord.session;
  const course = attendanceSession.course;
  const className = `${course.code} · ${course.name}`;

  const baseLogData = {
    courseId: course.id,
    sessionId: attendanceSession.id,
    userId: studentId,
    studentName: student?.name ?? student?.email,
    studentNumber: student?.schoolNumber,
    className,
    scannedBy: student?.name ?? student?.email,
    scanSource: input.scanSource,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracyMeters: input.accuracyMeters,
    actionType: "YOKLAMA" as const,
  };

  // Check if student is attempting to scan a QR code for a different course
  if (input.targetCourseId && input.targetCourseId !== course.id) {
    await createQrScanLog({
      ...baseLogData,
      result: "INVALID_QR",
      resultMessage: `Farklı bir dersin QR kodu okutuldu. Beklenen ders ID: ${input.targetCourseId}, Okutulan ders: ${course.code}`,
    });
    throw new ApiError(
      400,
      "COURSE_MISMATCH",
      "Okutulan QR kodu bu derse ait değil. Lütfen ilgili dersin QR kodunu okutun.",
    );
  }

  if (!student?.image) {
    await createQrScanLog({
      ...baseLogData,
      result: "PHOTO_REQUIRED",
      resultMessage: "Profil fotoğrafı yüklenmediği için yoklama reddedildi.",
    });
    throw new ApiError(
      403,
      "PROFILE_PHOTO_REQUIRED",
      "Yoklama alabilmek için profil fotoğrafı yüklemeniz zorunludur. Lütfen öğrenci panelinizden profil fotoğrafınızı ekleyin.",
    );
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: { courseId: attendanceSession.courseId, matchedUserId: studentId },
    select: { id: true },
  });
  if (!enrollment) {
    await createQrScanLog({
      ...baseLogData,
      result: "NOT_ENROLLED",
      resultMessage: "Öğrenci bu dersin listesinde kayıtlı değil veya eşleştirilmemiş.",
    });
    throw new ApiError(
      403,
      "STUDENT_NOT_ENROLLED",
      "Bu dersin öğrenci listesinde doğrulanmış kaydınız yok. Öğretmeninizle iletişime geçin.",
    );
  }

  const existing = await prisma.attendanceRecord.findUnique({
    where: {
      sessionId_enrollmentId: {
        sessionId: attendanceSession.id,
        enrollmentId: enrollment.id,
      },
    },
    select: { id: true },
  });
  if (existing) {
    await createQrScanLog({
      ...baseLogData,
      enrollmentId: enrollment.id,
      result: "DUPLICATE_SCAN",
      resultMessage: "Bu oturum için yoklama daha önce alınmış (tekrar okutma).",
    });
    throw new ApiError(409, "ALREADY_RECORDED", "Bu yoklamaya zaten katıldınız.");
  }

  const ipAddress = context.ipAddress;
  const hasIpRestrictions = attendanceSession.allowedIpRanges.length > 0;
  if (hasIpRestrictions && (!ipAddress || !isIpAllowed(ipAddress, attendanceSession.allowedIpRanges))) {
    await prisma.attendanceAttempt.create({
      data: {
        sessionId: attendanceSession.id,
        enrollmentId: enrollment.id,
        studentId,
        tokenNonceHash: tokenRecord.nonceHash,
        ipAddress,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracyMeters: input.accuracyMeters,
        status: "REJECTED",
        reasonCode: "SCHOOL_NETWORK_REQUIRED",
      },
    });
    await createQrScanLog({
      ...baseLogData,
      enrollmentId: enrollment.id,
      result: "OUT_OF_NETWORK",
      resultMessage: "Okul Wi-Fi / yerel ağının dışında okutuldu.",
    });
    throw new ApiError(
      403,
      "SCHOOL_NETWORK_REQUIRED",
      "Okul ağında değilsiniz. Okul Wi-Fi ağına bağlanıp tekrar deneyin.",
    );
  }

  const location = isWithinAllowedRadius(
    { latitude: attendanceSession.schoolLat, longitude: attendanceSession.schoolLng },
    { latitude: input.latitude, longitude: input.longitude },
    attendanceSession.allowedRadiusMeters,
  );
  if (!location.allowed) {
    await prisma.attendanceAttempt.create({
      data: {
        sessionId: attendanceSession.id,
        enrollmentId: enrollment.id,
        studentId,
        tokenNonceHash: tokenRecord.nonceHash,
        ipAddress,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracyMeters: input.accuracyMeters,
        distanceMeters: location.distanceMeters,
        status: "REJECTED",
        reasonCode: "SCHOOL_LOCATION_REQUIRED",
      },
    });
    await createQrScanLog({
      ...baseLogData,
      enrollmentId: enrollment.id,
      distanceMeters: location.distanceMeters,
      result: "OUT_OF_RADIUS",
      resultMessage: `Okul konumu sınırları dışında okutuldu (Mesafe: ${Math.round(location.distanceMeters ?? 0)}m).`,
    });
    throw new ApiError(
      403,
      "SCHOOL_LOCATION_REQUIRED",
      "Okul konumunda değilsiniz. Okul binasına yaklaşıp konum iznini açık tutarak tekrar deneyin.",
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.attendanceRecord.create({
        data: {
          sessionId: attendanceSession.id,
          enrollmentId: enrollment.id,
          studentId,
          source: "QR_SCAN",
          status: "PRESENT",
          ipAddress,
          latitude: input.latitude,
          longitude: input.longitude,
          accuracyMeters: input.accuracyMeters,
          distanceMeters: location.distanceMeters,
        },
      });
      await tx.attendanceAttempt.create({
        data: {
          sessionId: attendanceSession.id,
          enrollmentId: enrollment.id,
          studentId,
          tokenNonceHash: tokenRecord.nonceHash,
          ipAddress,
          latitude: input.latitude,
          longitude: input.longitude,
          accuracyMeters: input.accuracyMeters,
          distanceMeters: location.distanceMeters,
          status: "ACCEPTED",
        },
      });
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new ApiError(409, "ALREADY_RECORDED", "Bu yoklamaya zaten katıldınız.");
    }
    throw error;
  }

  await createQrScanLog({
    ...baseLogData,
    enrollmentId: enrollment.id,
    distanceMeters: location.distanceMeters,
    result: "SUCCESS",
    resultMessage: "Yoklama başarıyla kaydedildi.",
  });

  return {
    courseName: attendanceSession.course.name,
    courseCode: attendanceSession.course.code,
    sessionId: claims.sessionId,
  };
}
