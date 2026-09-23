import "server-only";

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http/api-error";

import { buildStudentAttendanceRows } from "./report";

export async function getCourseAttendanceReport(teacherId: string, courseId: string) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, teacherId },
    select: {
      id: true,
      name: true,
      code: true,
      mandatoryAlertLimit: true,
      enrollments: {
        orderBy: [{ fullNameOnList: "asc" }],
        select: {
          id: true,
          fullNameOnList: true,
          schoolNumberOnList: true,
          isMandatory: true,
          matchedUser: {
            select: { image: true },
          },
        },
      },
      attendanceSessions: {
        where: { status: "CLOSED" },
        orderBy: [{ startedAt: "asc" }],
        select: {
          id: true,
          weekNumber: true,
          sessionIndexInWeek: true,
          startedAt: true,
          createdBy: true,
          attendanceRecords: {
            select: { enrollmentId: true, status: true },
          },
        },
      },
    },
  });
  if (!course) {
    throw new ApiError(404, "COURSE_NOT_FOUND", "Ders bulunamadı.");
  }

  const rows = buildStudentAttendanceRows(
    course.attendanceSessions.map(({ attendanceRecords, ...attendanceSession }) => ({
      ...attendanceSession,
      records: attendanceRecords,
    })),
    course.enrollments,
    course.mandatoryAlertLimit,
  );

  return {
    course: {
      id: course.id,
      name: course.name,
      code: course.code,
      mandatoryAlertLimit: course.mandatoryAlertLimit,
    },
    sessions: course.attendanceSessions.map(({ attendanceRecords, ...session }) => ({
      ...session,
      recordedCount: attendanceRecords.length,
    })),
    rows,
    summary: {
      sessionCount: course.attendanceSessions.length,
      studentCount: course.enrollments.length,
      alertCount: rows.filter((row) => row.alert).length,
      averageAttendanceRate:
        rows.length === 0
          ? 0
          : Math.round(rows.reduce((total, row) => total + row.attendanceRate, 0) / rows.length),
    },
  };
}

export type CourseAttendanceReport = Awaited<ReturnType<typeof getCourseAttendanceReport>>;
