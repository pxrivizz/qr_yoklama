import type { AttendanceStatus } from "@/generated/prisma/enums";

type ReportSession = {
  id: string;
  weekNumber: number;
  sessionIndexInWeek: number;
  startedAt: Date;
  createdBy: "SYSTEM_QR" | "TEACHER_MANUAL";
  records: Array<{
    enrollmentId: string;
    status: AttendanceStatus;
  }>;
};

type ReportEnrollment = {
  id: string;
  fullNameOnList: string;
  schoolNumberOnList: string;
  isMandatory: boolean;
  matchedUser?: {
    image: string | null;
  } | null;
};

export type StudentAttendanceReportRow = ReportEnrollment & {
  statuses: AttendanceStatus[];
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
  alert: boolean;
};

export function buildStudentAttendanceRows(
  sessions: ReportSession[],
  enrollments: ReportEnrollment[],
  mandatoryAlertLimit: number | null,
): StudentAttendanceReportRow[] {
  const recordsBySession = sessions.map(
    (session) => new Map(session.records.map((record) => [record.enrollmentId, record.status])),
  );

  return enrollments.map((enrollment) => {
    const statuses = recordsBySession.map(
      (records) => records.get(enrollment.id) ?? ("ABSENT" as const),
    );
    const presentCount = statuses.filter((status) => status === "PRESENT").length;
    const absentCount = statuses.filter((status) => status !== "PRESENT").length;
    const attendanceRate =
      sessions.length === 0 ? 0 : Math.round(((presentCount) / sessions.length) * 100);

    return {
      ...enrollment,
      statuses,
      presentCount,
      absentCount,
      attendanceRate,
      alert:
        enrollment.isMandatory &&
        mandatoryAlertLimit !== null &&
        absentCount >= mandatoryAlertLimit,
    };
  });
}
