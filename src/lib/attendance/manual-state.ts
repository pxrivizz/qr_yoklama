export type ManualAttendanceStatus = "PRESENT" | "ABSENT";

type ExistingAttendanceRecord = {
  enrollmentId: string;
  status: string;
};

type ExistingAttendanceSession = {
  weekNumber: number;
  sessionIndexInWeek: number;
  status: "ACTIVE" | "CLOSED";
  createdBy: "SYSTEM_QR" | "TEACHER_MANUAL";
};

export function buildManualAttendanceRecords(
  enrollmentIds: string[],
  existingRecords: ExistingAttendanceRecord[],
): Record<string, ManualAttendanceStatus> {
  const statuses = new Map(
    existingRecords.map((record) => [
      record.enrollmentId,
      record.status === "PRESENT" ? "PRESENT" : "ABSENT",
    ] as const),
  );

  return Object.fromEntries(
    enrollmentIds.map((enrollmentId) => [
      enrollmentId,
      statuses.get(enrollmentId) ?? "ABSENT",
    ]),
  );
}

export function chooseInitialManualAttendanceSlot<T extends ExistingAttendanceSession>(
  sessionsNewestFirst: T[],
  nextSlot: { weekNumber: number; sessionIndexInWeek: number },
) {
  return sessionsNewestFirst.find((session) => session.status === "ACTIVE")
    ?? sessionsNewestFirst.find((session) => session.createdBy === "SYSTEM_QR")
    ?? sessionsNewestFirst[0]
    ?? nextSlot;
}
