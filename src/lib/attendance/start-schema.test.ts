import { describe, expect, it } from "vitest";

import { startAttendanceSessionSchema } from "./start-schema";

describe("startAttendanceSessionSchema", () => {
  it("hafta ve oturum seçimini kabul eder", () => {
    expect(startAttendanceSessionSchema.parse({ weekNumber: 4, sessionIndexInWeek: 2 })).toEqual({
      weekNumber: 4,
      sessionIndexInWeek: 2,
    });
  });

  it("geçersiz sınırları ve ek alanları reddeder", () => {
    expect(() => startAttendanceSessionSchema.parse({ weekNumber: 0, sessionIndexInWeek: 1 })).toThrow();
    expect(() => startAttendanceSessionSchema.parse({ weekNumber: 1, sessionIndexInWeek: 11 })).toThrow();
    expect(() => startAttendanceSessionSchema.parse({ weekNumber: 1, sessionIndexInWeek: 1, extra: true })).toThrow();
  });

  it("hazırlık sınıfı tarih ve ders sırası seçimini kabul eder", () => {
    expect(startAttendanceSessionSchema.parse({
      sessionDate: "2026-09-28",
      lessonPeriod: 4,
    })).toEqual({ sessionDate: "2026-09-28", lessonPeriod: 4 });
    expect(() => startAttendanceSessionSchema.parse({
      sessionDate: "28.09.2026",
      lessonPeriod: 4,
    })).toThrow();
  });
});
