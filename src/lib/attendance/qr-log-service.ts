import "server-only";

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http/api-error";
import type {
  QrScanActionType,
  QrScanResult,
  Prisma,
} from "@/generated/prisma/client";

export type DeviceDetails = {
  summary: string;
  os?: string;
  browser?: string;
  deviceType?: string;
};

export function parseDeviceInfo(userAgent?: string | null): DeviceDetails {
  if (!userAgent) {
    return { summary: "Bilinmeyen Cihaz / Web" };
  }

  let os = "Bilinmeyen İşletim Sistemi";
  let deviceType = "Masaüstü";

  if (/iPhone/i.test(userAgent)) {
    os = "iOS (iPhone)";
    deviceType = "Mobil (iPhone)";
  } else if (/iPad/i.test(userAgent)) {
    os = "iPadOS (iPad)";
    deviceType = "Tablet (iPad)";
  } else if (/Android/i.test(userAgent)) {
    os = "Android";
    deviceType = /Mobile/i.test(userAgent) ? "Mobil (Android)" : "Tablet (Android)";
  } else if (/Windows NT 10.0/i.test(userAgent)) {
    os = "Windows 10/11";
    deviceType = "Bilgisayar (Windows)";
  } else if (/Macintosh|Mac OS X/i.test(userAgent)) {
    os = "macOS";
    deviceType = "Bilgisayar (Mac)";
  } else if (/Linux/i.test(userAgent)) {
    os = "Linux";
    deviceType = "Bilgisayar (Linux)";
  }

  let browser = "Web Tarayıcısı";
  if (/Edg\//i.test(userAgent)) {
    browser = "Microsoft Edge";
  } else if (/Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent)) {
    browser = "Google Chrome";
  } else if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) {
    browser = "Apple Safari";
  } else if (/Firefox\//i.test(userAgent)) {
    browser = "Mozilla Firefox";
  } else if (/OPR\//i.test(userAgent) || /Opera/i.test(userAgent)) {
    browser = "Opera";
  }

  return {
    summary: `${deviceType} · ${browser} (${os})`,
    os,
    browser,
    deviceType,
  };
}

export function formatLocationSummary(
  latitude?: number | null,
  longitude?: number | null,
  accuracyMeters?: number | null,
  distanceMeters?: number | null,
): string | undefined {
  if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
    return undefined;
  }

  const latFixed = latitude.toFixed(6);
  const lngFixed = longitude.toFixed(6);
  const parts: string[] = [`${latFixed}, ${lngFixed}`];

  if (accuracyMeters !== undefined && accuracyMeters !== null) {
    parts.push(`±${Math.round(accuracyMeters)}m`);
  }
  if (distanceMeters !== undefined && distanceMeters !== null) {
    parts.push(`Mesafe: ${Math.round(distanceMeters)}m`);
  }

  return parts.join(" · ");
}

export type CreateQrScanLogInput = {
  courseId?: string | null;
  sessionId?: string | null;
  enrollmentId?: string | null;
  userId?: string | null;
  studentName?: string | null;
  studentNumber?: string | null;
  className?: string | null;
  actionType?: QrScanActionType;
  scannedBy?: string | null;
  scanSource?: string | null;
  deviceInfo?: string | null;
  ipAddress?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
  distanceMeters?: number | null;
  result: QrScanResult;
  resultMessage?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function createQrScanLog(input: CreateQrScanLogInput) {
  try {
    const parsedDevice = parseDeviceInfo(input.userAgent);
    const computedDeviceInfo = input.deviceInfo || parsedDevice.summary;
    const computedLocation =
      input.location ||
      formatLocationSummary(
        input.latitude,
        input.longitude,
        input.accuracyMeters,
        input.distanceMeters,
      );

    return await prisma.qrScanLog.create({
      data: {
        courseId: input.courseId,
        sessionId: input.sessionId,
        enrollmentId: input.enrollmentId,
        userId: input.userId,
        studentName: input.studentName,
        studentNumber: input.studentNumber,
        className: input.className,
        actionType: input.actionType ?? "YOKLAMA",
        scannedBy: input.scannedBy,
        scanSource: input.scanSource ?? (parsedDevice.deviceType?.includes("Mobil") ? "Telefon Kamerası" : "Kamera"),
        deviceInfo: computedDeviceInfo,
        ipAddress: input.ipAddress,
        location: computedLocation,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracyMeters: input.accuracyMeters,
        distanceMeters: input.distanceMeters,
        result: input.result,
        resultMessage: input.resultMessage,
        userAgent: input.userAgent,
        metadata: input.metadata,
      },
    });
  } catch (error) {
    console.error("[createQrScanLog] Log kaydı oluşturulurken hata:", error);
    return null;
  }
}

export type GetQrScanLogsParams = {
  teacherId?: string;
  courseId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  actionType?: QrScanActionType;
  result?: QrScanResult;
  page?: number;
  pageSize?: number;
};

export async function getQrScanLogs(params: GetQrScanLogsParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const andConditions: Prisma.QrScanLogWhereInput[] = [];

  if (params.teacherId) {
    // Fetch matchedUserIds for all students enrolled in teacher's courses
    // so that records with null courseId/sessionId (e.g. INVALID_QR) are still scoped
    const matchedEnrollments = await prisma.enrollment.findMany({
      where: { course: { teacherId: params.teacherId }, matchedUserId: { not: null } },
      select: { matchedUserId: true },
    });
    const enrolledUserIds = matchedEnrollments
      .map((e) => e.matchedUserId)
      .filter((id): id is string => id !== null);

    andConditions.push({
      OR: [
        // Record linked to a course taught by this teacher
        { course: { teacherId: params.teacherId } },
        // Record linked to a session of a course taught by this teacher
        { session: { course: { teacherId: params.teacherId } } },
        // Record where course could not be determined (e.g. INVALID_QR before course lookup),
        // but user is enrolled in one of teacher's courses
        ...(enrolledUserIds.length > 0
          ? [{ userId: { in: enrolledUserIds }, courseId: null, sessionId: null }]
          : []),
      ],
    });
  }

  if (params.courseId) {
    andConditions.push({
      courseId: params.courseId,
      ...(params.teacherId ? { course: { teacherId: params.teacherId } } : {}),
    });
  }

  if (params.actionType) {
    andConditions.push({ actionType: params.actionType });
  }

  if (params.result) {
    andConditions.push({ result: params.result });
  }

  if (params.startDate) {
    const start = new Date(params.startDate);
    if (!isNaN(start.getTime())) {
      start.setHours(0, 0, 0, 0);
      andConditions.push({ scannedAt: { gte: start } });
    }
  }

  if (params.endDate) {
    const end = new Date(params.endDate);
    if (!isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      andConditions.push({ scannedAt: { lte: end } });
    }
  }

  if (params.search?.trim()) {
    const query = params.search.trim();
    andConditions.push({
      OR: [
        { studentName: { contains: query, mode: "insensitive" } },
        { studentNumber: { contains: query, mode: "insensitive" } },
        { className: { contains: query, mode: "insensitive" } },
        { scannedBy: { contains: query, mode: "insensitive" } },
        { ipAddress: { contains: query } },
      ],
    });
  }

  const where: Prisma.QrScanLogWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const [total, logs, statsCounts] = await Promise.all([
    prisma.qrScanLog.count({ where }),
    prisma.qrScanLog.findMany({
      where,
      orderBy: { scannedAt: "desc" },
      skip,
      take: pageSize,
      include: {
        course: {
          select: { id: true, name: true, code: true },
        },
        session: {
          select: { id: true, weekNumber: true, sessionIndexInWeek: true, status: true },
        },
        user: {
          select: { id: true, name: true, email: true, image: true, schoolNumber: true },
        },
      },
    }),
    prisma.qrScanLog.groupBy({
      by: ["result"],
      where: params.teacherId
        ? {
            OR: [
              { course: { teacherId: params.teacherId } },
              { session: { course: { teacherId: params.teacherId } } },
            ],
          }
        : {},
      _count: { id: true },
    }),
  ]);

  let totalScans = 0;
  let successCount = 0;
  let duplicateCount = 0;
  let failedCount = 0;

  for (const group of statsCounts) {
    const count = group._count.id;
    totalScans += count;
    if (group.result === "SUCCESS") {
      successCount += count;
    } else if (group.result === "DUPLICATE_SCAN") {
      duplicateCount += count;
    } else {
      failedCount += count;
    }
  }

  return {
    logs,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
    stats: {
      totalScans,
      successCount,
      duplicateCount,
      failedCount,
    },
  };
}

export async function deleteQrScanLog(id: string, requesterRole: string) {
  if (requesterRole !== "ADMIN") {
    throw new ApiError(
      403,
      "LOG_DELETE_FORBIDDEN",
      "QR okutma logları sistem denetim ve güvenlik politikası gereği silinemez.",
    );
  }

  return await prisma.qrScanLog.delete({
    where: { id },
  });
}
