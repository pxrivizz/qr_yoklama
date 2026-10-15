import type { AttendanceStatus } from "@/generated/prisma/enums";

export function countsAsAttended(status: AttendanceStatus): boolean {
  return status === "PRESENT" || status === "LATE" || status === "FLAGGED";
}

export function absenceContribution(status: AttendanceStatus): number {
  return status === "ABSENT" ? 1 : 0;
}

export function isExcusedStatus(status: AttendanceStatus): boolean {
  return status === "EXCUSED";
}

export function scanAttendanceStatus(
  startedAt: Date,
  lateAfterMinutes: number | null,
  now = new Date(),
): AttendanceStatus {
  if (
    lateAfterMinutes !== null &&
    now.getTime() - startedAt.getTime() >= lateAfterMinutes * 60_000
  ) {
    return "LATE";
  }
  return "PRESENT";
}
