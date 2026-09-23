import "server-only";

import { calculatePlannedSessionCount } from "@/lib/attendance/schedule";
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
  weekNumber: number;
  sessionIndexInWeek: number;
  startedAt: Date;
  presentCount: number;
  enrollmentCount: number;
};

export type RecentSessionSummary = {
  id: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  weekNumber: number;
  sessionIndexInWeek: number;
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
  plannedSessions: number;
  progress: number;
  enrollmentCount: number;
  hasActiveSession: boolean;
  totalWeeks: number;
  weeklySessionCount: number;
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
          weekNumber: true,
          sessionIndexInWeek: true,
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
        weekNumber: active.weekNumber,
        sessionIndexInWeek: active.sessionIndexInWeek,
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
    weekNumber: number;
    sessionIndexInWeek: number;
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
        weekNumber: s.weekNumber,
        sessionIndexInWeek: s.sessionIndexInWeek,
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
      plannedSessions: planned,
      progress,
      enrollmentCount: course._count.enrollments,
      hasActiveSession: course.attendanceSessions.some((s) => s.status === "ACTIVE"),
      totalWeeks: course.totalWeeks,
      weeklySessionCount: course.weeklySessionCount,
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
