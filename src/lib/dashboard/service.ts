import "server-only";

import { calculatePlannedSessionCount } from "@/lib/attendance/schedule";
import { sessionDateKey } from "@/lib/attendance/slot";
import { prisma } from "@/lib/db";

export type DashboardStats = {
  totalCourses: number;
  totalEnrollments: number;
  activeSessions: number;
  activeSessionCount: number;
  completedSessionCount: number;
  overallAttendanceRate: number;
  presentCount: number;
  absentCount: number;
  alertStudentCount: number;
};

export type ActiveSessionSummary = {
  sessionId: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  slotType: "WEEKLY" | "CALENDAR_PERIOD";
  weekNumber: number | null;
  sessionIndexInWeek: number | null;
  sessionDate: string | null;
  lessonPeriod: number | null;
  startedAt: Date;
  presentCount: number;
  enrollmentCount: number;
};

export type RecentSessionSummary = {
  id: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  slotType: "WEEKLY" | "CALENDAR_PERIOD";
  weekNumber: number | null;
  sessionIndexInWeek: number | null;
  sessionDate: string | null;
  lessonPeriod: number | null;
  startedAt: Date;
  status: "ACTIVE" | "CLOSED";
  presentCount: number;
  totalEnrollments: number;
  attendanceRate: number;
};

export type CourseSummaryItem = {
  id: string;
  name: string;
  code: string;
  completedSessions: number;
  completedSessionSlots: Array<{
    id: string;
    slotType: "WEEKLY" | "CALENDAR_PERIOD";
    weekNumber: number | null;
    sessionIndexInWeek: number | null;
    sessionDate: string | null;
    lessonPeriod: number | null;
  }>;
  plannedSessions: number;
  progress: number;
  enrollmentCount: number;
  hasActiveSession: boolean;
  totalWeeks: number;
  weeklySessionCount: number;
  attendanceMode: "STANDARD" | "PREPARATORY";
  preparatoryDayPlans: Array<{ weekday: number; lessonCount: number }>;
};

export async function getTeacherDashboardData(teacherId: string) {
  const courses = await prisma.course.findMany({
    where: { teacherId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      code: true,
      weeklySessionCount: true,
      totalWeeks: true,
      attendanceMode: true,
      preparatoryDayPlans: {
        orderBy: { weekday: "asc" },
        select: { weekday: true, lessonCount: true },
      },
      mandatoryAlertLimit: true,
      createdAt: true,
      enrollments: {
        select: {
          id: true,
          fullNameOnList: true,
          schoolNumberOnList: true,
          isMandatory: true,
        },
      },
      _count: {
        select: {
          enrollments: true,
          attendanceSessions: { where: { status: "CLOSED" } },
        },
      },
      attendanceSessions: {
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          slotType: true,
          weekNumber: true,
          sessionIndexInWeek: true,
          sessionDate: true,
          lessonPeriod: true,
          startedAt: true,
          status: true,
          attendanceRecords: {
            select: {
              status: true,
              enrollmentId: true,
            },
          },
        },
      },
    },
  });

  const totalCourses = courses.length;
  const totalEnrollments = courses.reduce((sum, c) => sum + c._count.enrollments, 0);
  const completedSessionCount = courses.reduce((sum, c) => sum + c._count.attendanceSessions, 0);

  const activeSessions: ActiveSessionSummary[] = [];
  let totalRecordsCount = 0;
  let presentCount = 0;
  let absentCount = 0;
  for (const c of courses) {
    const active = c.attendanceSessions.find((s) => s.status === "ACTIVE");
    if (active) {
      const activePresent = active.attendanceRecords.filter((r) =>
        r.status === "PRESENT",
      ).length;
      activeSessions.push({
        sessionId: active.id,
        courseId: c.id,
        courseName: c.name,
        courseCode: c.code,
        slotType: active.slotType,
        weekNumber: active.weekNumber,
        sessionIndexInWeek: active.sessionIndexInWeek,
        sessionDate: active.sessionDate ? sessionDateKey(active.sessionDate) : null,
        lessonPeriod: active.lessonPeriod,
        startedAt: active.startedAt,
        presentCount: activePresent,
        enrollmentCount: c._count.enrollments,
      });
    }

    for (const session of c.attendanceSessions) {
      if (session.status === "CLOSED") {
        const sessionPresentCount = session.attendanceRecords.filter(
          (record) => record.status === "PRESENT",
        ).length;
        totalRecordsCount += c._count.enrollments;
        presentCount += sessionPresentCount;
        absentCount += Math.max(0, c._count.enrollments - sessionPresentCount);
      }
    }
  }

  const attendedCount = presentCount;
  const overallAttendanceRate =
    totalRecordsCount > 0 ? Math.round((attendedCount / totalRecordsCount) * 100) : 0;

  const recentSessions: RecentSessionSummary[] = [];
  const allSessionsFlat: Array<{
    id: string;
    courseId: string;
    courseName: string;
    courseCode: string;
    slotType: "WEEKLY" | "CALENDAR_PERIOD";
    weekNumber: number | null;
    sessionIndexInWeek: number | null;
    sessionDate: string | null;
    lessonPeriod: number | null;
    startedAt: Date;
    status: "ACTIVE" | "CLOSED";
    presentCount: number;
    totalEnrollments: number;
    attendanceRate: number;
  }> = [];

  for (const c of courses) {
    for (const s of c.attendanceSessions) {
      const enrolled = c._count.enrollments;
      const attended = s.attendanceRecords.filter(
        (r) => r.status === "PRESENT",
      ).length;
      const rate = enrolled > 0 ? Math.round((attended / enrolled) * 100) : 0;

      allSessionsFlat.push({
        id: s.id,
        courseId: c.id,
        courseName: c.name,
        courseCode: c.code,
        slotType: s.slotType,
        weekNumber: s.weekNumber,
        sessionIndexInWeek: s.sessionIndexInWeek,
        sessionDate: s.sessionDate ? sessionDateKey(s.sessionDate) : null,
        lessonPeriod: s.lessonPeriod,
        startedAt: s.startedAt,
        status: s.status,
        presentCount: attended,
        totalEnrollments: enrolled,
        attendanceRate: rate,
      });
    }
  }

  allSessionsFlat.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  recentSessions.push(...allSessionsFlat.slice(0, 5));

  let alertStudentCount = 0;
  for (const c of courses) {
    if (c.mandatoryAlertLimit !== null && c.mandatoryAlertLimit > 0) {
      const closedSessions = c.attendanceSessions.filter((s) => s.status === "CLOSED");
      for (const enrollment of c.enrollments) {
        if (!enrollment.isMandatory) continue;
        const attendedSessions = closedSessions.filter((session) =>
          session.attendanceRecords.some(
            (record) =>
              record.enrollmentId === enrollment.id && record.status === "PRESENT",
          ),
        ).length;
        const absents = Math.max(0, closedSessions.length - attendedSessions);
        if (absents >= c.mandatoryAlertLimit) {
          alertStudentCount++;
        }
      }
    }
  }

  const coursesSummary: CourseSummaryItem[] = courses.slice(0, 4).map((course) => {
    const planned = calculatePlannedSessionCount(course.weeklySessionCount, course.totalWeeks);
    const completed = course._count.attendanceSessions;
    const progress = planned > 0 ? Math.min(100, Math.round((completed / planned) * 100)) : 0;
    return {
      id: course.id,
      name: course.name,
      code: course.code,
      completedSessions: completed,
      completedSessionSlots: course.attendanceSessions
        .filter((session) => session.status === "CLOSED")
        .map((session) => ({
          id: session.id,
          slotType: session.slotType,
          weekNumber: session.weekNumber,
          sessionIndexInWeek: session.sessionIndexInWeek,
          sessionDate: session.sessionDate ? sessionDateKey(session.sessionDate) : null,
          lessonPeriod: session.lessonPeriod,
        })),
      plannedSessions: planned,
      progress,
      enrollmentCount: course._count.enrollments,
      hasActiveSession: course.attendanceSessions.some((s) => s.status === "ACTIVE"),
      totalWeeks: course.totalWeeks,
      weeklySessionCount: course.weeklySessionCount,
      attendanceMode: course.attendanceMode,
      preparatoryDayPlans: course.preparatoryDayPlans,
    };
  });

  return {
    stats: {
      totalCourses,
      totalEnrollments,
      activeSessions: activeSessions.length,
      activeSessionCount: activeSessions.length,
      completedSessionCount,
      overallAttendanceRate,
      presentCount,
      absentCount,
      alertStudentCount,
    },
    activeSessions,
    recentSessions,
    coursesSummary,
  };
}
