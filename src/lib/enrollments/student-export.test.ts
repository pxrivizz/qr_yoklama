import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import type { CourseStudentsExportData } from "./student-export";
import { buildEnrollmentsWorkbook, writeEnrollmentsWorkbook } from "./student-export";

const sampleData: CourseStudentsExportData = {
  course: {
    id: "course-1",
    name: "Veritabanı Yönetim Sistemleri",
    code: "BLG-202",
    mandatoryAlertLimit: 3,
  },
  students: [
    {
      id: "enr-1",
      fullName: "Ali Demir",
      schoolNumber: "2024001",
      isMandatory: true,
      matchedUser: {
        name: "Ali Demir",
        email: "ali@universite.edu.tr",
      },
      stats: {
        totalSessions: 5,
        attendedCount: 4,
        absentCount: 1,
        attendanceRate: 80,
        isFailed: false,
        isNearLimit: false,
      },
    },
    {
      id: "enr-2",
      fullName: "Zeynep Kaya",
      schoolNumber: "2024002",
      isMandatory: false,
      matchedUser: null,
      stats: {
        totalSessions: 5,
        attendedCount: 1,
        absentCount: 4,
        attendanceRate: 20,
        isFailed: false,
        isNearLimit: false,
      },
    },
  ],
  summary: {
    totalStudents: 2,
    mandatoryCount: 1,
    optionalCount: 1,
    matchedCount: 1,
    unmatchedCount: 1,
    alertCount: 0,
  },
};

describe("student enrollments workbook export", () => {
  it("öğrenci bilgilerini ve başlıkları doğru sırada yazar", () => {
    const workbook = buildEnrollmentsWorkbook(sampleData, new Date("2026-09-11T12:00:00.000Z"));
    const sheet = workbook.Sheets["Öğrenci Listesi"];
    const values = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true });

    expect(values[5]).toEqual([
      "Sıra",
      "Öğrenci No",
      "Adı Soyadı",
      "Devam Statüsü",
      "Sistem Hesabı",
      "E-posta",
      "Katıldığı",
      "Devamsızlık",
      "Katılım Oranı",
      "Durum",
    ]);

    expect(values[6]).toEqual([
      1,
      "2024001",
      "Ali Demir",
      "Devam Zorunlu",
      "Eşleşti",
      "ali@universite.edu.tr",
      4,
      1,
      0.8,
      "Normal",
    ]);

    expect(values[7]).toEqual([
      2,
      "2024002",
      "Zeynep Kaya",
      "Devam Muaf (Alttan)",
      "Bekleniyor",
      "—",
      1,
      4,
      0.2,
      "Normal",
    ]);
  });

  it("geçerli bir xlsx ikili çıktısı üretir", () => {
    const buffer = writeEnrollmentsWorkbook(sampleData);
    expect(Buffer.from(buffer).subarray(0, 2).toString()).toBe("PK");
    const parsed = XLSX.read(buffer, { type: "buffer" });
    expect(parsed.SheetNames).toContain("Öğrenci Listesi");
  });
});
