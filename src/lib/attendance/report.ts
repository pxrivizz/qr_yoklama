import type { AttendanceStatus } from "@/generated/prisma/enums";
import { absenceContribution, countsAsAttended } from "@/lib/attendance/status";

type ReportSession = {
  id: string;
  slotType: "WEEKLY" | "CALENDAR_PERIOD";
  weekNumber: number | null;
  sessionIndexInWeek: number | null;
  sessionDate: Date | null;
  lessonPeriod: number | null;
  startedAt: Date;
  createdBy: "SYSTEM_QR" | "TEACHER_MANUAL";
  records: Array<{
    enrollmentId: string;
    status: AttendanceStatus;
    recordedAt: Date;
    ipAddress: string | null;
    deviceFingerprintHash: string | null;
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
  recordDetails: Array<{
    recordedAt: Date;
    ipAddress: string | null;
    deviceFingerprintHash: string | null;
  } | null>;
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
    (session) => new Map(session.records.map((record) => [record.enrollmentId, record])),
  );

  return enrollments.map((enrollment) => {
    const statuses = recordsBySession.map(
      (records) => records.get(enrollment.id)?.status ?? ("ABSENT" as const),
    );
    const recordDetails = recordsBySession.map((records) => {
      const record = records.get(enrollment.id);
      return record
        ? {
            recordedAt: record.recordedAt,
            ipAddress: record.ipAddress,
            deviceFingerprintHash: record.deviceFingerprintHash,
          }
        : null;
    });
    const presentCount = statuses.filter(countsAsAttended).length;
    const absentCount = statuses.reduce(
      (total, status) => total + absenceContribution(status),
      0,
    );
    const attendanceRate =
      sessions.length === 0 ? 0 : Math.round(((presentCount) / sessions.length) * 100);

    return {
      ...enrollment,
      statuses,
      recordDetails,
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
