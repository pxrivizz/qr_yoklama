import { describe, expect, it } from "vitest";

import { buildStudentAttendanceRows } from "./report";

const enrollments = [
  {
    id: "student-1",
    fullNameOnList: "Ayşe Yılmaz",
    schoolNumberOnList: "1001",
    isMandatory: true,
  },
  {
    id: "student-2",
    fullNameOnList: "Mehmet Kaya",
    schoolNumberOnList: "1002",
    isMandatory: false,
  },
];

describe("yoklama raporu", () => {
  it("kapalı oturumdaki eksik QR kaydını yok sayar", () => {
    const rows = buildStudentAttendanceRows(
      [
        {
          id: "session-1",
          weekNumber: 1,
          sessionIndexInWeek: 1,
          startedAt: new Date("2026-08-01T08:00:00Z"),
          createdBy: "SYSTEM_QR",
          records: [{ enrollmentId: "student-1", status: "PRESENT" }],
        },
      ],
      enrollments,
      1,
    );

    expect(rows[0]).toMatchObject({ statuses: ["PRESENT"], absentCount: 0, alert: false });
    expect(rows[1]).toMatchObject({ statuses: ["ABSENT"], absentCount: 1, alert: false });
  });

  it("katılım oranını hesaplar ve zorunlu eşik uyarısını üretir", () => {
    const rows = buildStudentAttendanceRows(
      [
        {
          id: "session-1",
          weekNumber: 1,
          sessionIndexInWeek: 1,
          startedAt: new Date("2026-08-01T08:00:00Z"),
          createdBy: "TEACHER_MANUAL",
          records: [{ enrollmentId: "student-1", status: "PRESENT" }],
        },
        {
          id: "session-2",
          weekNumber: 1,
          sessionIndexInWeek: 2,
          startedAt: new Date("2026-08-02T08:00:00Z"),
          createdBy: "SYSTEM_QR",
          records: [],
        },
      ],
      enrollments.slice(0, 1),
      1,
    );

    expect(rows[0]).toMatchObject({
      statuses: ["PRESENT", "ABSENT"],
      presentCount: 1,
      absentCount: 1,
      attendanceRate: 50,
      alert: true,
    });
  });
});
