import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import type { CourseAttendanceReport } from "./report-service";
import { buildAttendanceWorkbook, writeAttendanceWorkbook } from "./attendance-export";

const report = {
  course: {
    id: "course-1",
    name: "Web Programlama",
    code: "WEB-101",
    mandatoryAlertLimit: 2,
  },
  sessions: [
    {
      id: "session-1",
      weekNumber: 2,
      sessionIndexInWeek: 1,
      startedAt: new Date("2026-08-10T09:00:00.000Z"),
      createdBy: "SYSTEM_QR",
      recordedCount: 1,
    },
  ],
  rows: [
    {
      id: "enrollment-1",
      fullNameOnList: "Ayşe Yılmaz",
      schoolNumberOnList: "2026001",
      isMandatory: true,
      statuses: ["PRESENT"],
      presentCount: 1,
      absentCount: 0,
      attendanceRate: 100,
      alert: false,
    },
  ],
  summary: {
    sessionCount: 1,
    studentCount: 1,
    alertCount: 0,
    averageAttendanceRate: 100,
  },
} as CourseAttendanceReport;

describe("attendance workbook export", () => {
  it("rapordaki oturum ve öğrenci durumlarını aynı sırayla yazar", () => {
    const workbook = buildAttendanceWorkbook(report, new Date("2026-08-12T12:30:00.000Z"));
    const sheet = workbook.Sheets["Yoklama Raporu"];
    const values = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true });

    expect(values[5]).toEqual([
      "Öğrenci",
      "Öğrenci No",
      "Zorunlu",
      "H2.O1 (10.08)",
      "Var",
      "Yok",
      "Katılım Oranı",
    ]);
    expect(values[6]).toEqual([
      "Ayşe Yılmaz",
      "2026001",
      "Evet",
      "Var",
      1,
      0,
      1,
    ]);
  });

  it("geçerli bir xlsx ikili çıktısı üretir", () => {
    const buffer = writeAttendanceWorkbook(report);
    expect(Buffer.from(buffer).subarray(0, 2).toString()).toBe("PK");
    const parsed = XLSX.read(buffer, { type: "buffer" });
    expect(parsed.SheetNames).toContain("Yoklama Raporu");
  });

  it("formül enjeksiyonu karakterlerini tek tırnakla kaçırır", () => {
    const dangerousReport = {
      ...report,
      rows: [
        {
          ...report.rows[0],
          fullNameOnList: "=cmd|' /C calc'!A0",
          schoolNumberOnList: "+905551234567",
        },
      ],
    };
    const workbook = buildAttendanceWorkbook(dangerousReport);
    const sheet = workbook.Sheets["Yoklama Raporu"];
    const values = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true });
    expect(values[6][0]).toBe("'=cmd|' /C calc'!A0");
    expect(values[6][1]).toBe("'+905551234567");
  });
});
