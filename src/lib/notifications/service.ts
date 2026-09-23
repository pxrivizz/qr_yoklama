import "server-only";

import { prisma } from "@/lib/db";

export type NotificationItem = {
  id: string;
  userId: string;
  courseId: string | null;
  sessionId: string | null;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  course?: {
    id: string;
    name: string;
    code: string;
  } | null;
  session?: {
    id: string;
    status: string;
    weekNumber: number;
    sessionIndexInWeek: number;
    startedAt: Date;
  } | null;
};

/**
 * Creates in-app notifications for all students enrolled in the given course
 * when a teacher starts an active attendance session.
 */
export async function createAttendanceNotifications(courseId: string, sessionId: string) {
  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        name: true,
        code: true,
        enrollments: {
          where: { matchedUserId: { not: null } },
          select: { matchedUserId: true },
        },
      },
    });

    if (!course || course.enrollments.length === 0) {
      return 0;
    }

    const uniqueUserIds = Array.from(
      new Set(
        course.enrollments
          .map((e) => e.matchedUserId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (uniqueUserIds.length === 0) return 0;

    const existingNotifications = await prisma.notification.findMany({
      where: { sessionId },
      select: { userId: true },
    });
    const alreadyNotifiedUserIds = new Set(existingNotifications.map((n) => n.userId));
    const targetUserIds = uniqueUserIds.filter((id) => !alreadyNotifiedUserIds.has(id));

    if (targetUserIds.length === 0) return 0;

    await prisma.notification.createMany({
      data: targetUserIds.map((userId) => ({
        userId,
        courseId: course.id,
        sessionId,
        title: `${course.name} için yoklama başlatıldı.`,
        message: `${course.code} kodlu ders için yoklama oturumu başlatıldı. Lütfen süresi dolmadan QR kodunuzu okutarak yoklamaya katılın.`,
        type: "ATTENDANCE_STARTED",
        isRead: false,
      })),
    });

    return targetUserIds.length;
  } catch (error) {
    console.error("[createAttendanceNotifications] Bildirimler oluşturulurken hata:", error);
    return 0;
  }
}

/**
 * Retrieves the notifications for a specific student, including the unread count.
 */
export async function getStudentNotifications(studentId: string, limit = 20) {
  const safeLimit = Math.min(50, Math.max(1, limit));
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: studentId },
      orderBy: { createdAt: "desc" },
      take: safeLimit,
      include: {
        course: {
          select: { id: true, name: true, code: true },
        },
        session: {
          select: {
            id: true,
            status: true,
            weekNumber: true,
            sessionIndexInWeek: true,
            startedAt: true,
          },
        },
      },
    }),
    prisma.notification.count({
      where: { userId: studentId, isRead: false },
    }),
  ]);

  return {
    notifications,
    unreadCount,
  };
}

/**
 * Marks a single notification as read for the authenticated student.
 */
export async function markNotificationAsRead(studentId: string, notificationId: string) {
  if (!notificationId || typeof notificationId !== "string") {
    return { count: 0 };
  }
  return await prisma.notification.updateMany({
    where: { id: notificationId, userId: studentId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

/**
 * Marks all unread notifications as read for the authenticated student.
 */
export async function markAllNotificationsAsRead(studentId: string) {
  return await prisma.notification.updateMany({
    where: { userId: studentId, isRead: false },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}
