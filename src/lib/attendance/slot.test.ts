import { describe, expect, it } from "vitest";

import { lessonCountForDate, weekdayForSessionDate } from "./slot";

const plans = [
  { weekday: 1, lessonCount: 8 },
  { weekday: 2, lessonCount: 6 },
  { weekday: 3, lessonCount: 7 },
  { weekday: 4, lessonCount: 4 },
  { weekday: 5, lessonCount: 5 },
];

describe("hazırlık sınıfı günlük ders planı", () => {
  it("tarihi pazartesi 1, pazar 7 olacak şekilde güne çevirir", () => {
    expect(weekdayForSessionDate("2026-09-28")).toBe(1);
    expect(weekdayForSessionDate("2026-10-04")).toBe(7);
  });

  it("seçilen tarihin ders sayısını döndürür", () => {
    expect(lessonCountForDate(plans, "2026-09-28")).toBe(8);
    expect(lessonCountForDate(plans, "2026-09-29")).toBe(6);
    expect(lessonCountForDate(plans, "2026-10-03")).toBe(0);
  });
});
