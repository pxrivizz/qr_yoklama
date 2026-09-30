import { describe, expect, it } from "vitest";

import { createCourseSchema, updateCourseSchema } from "./schema";

const validCourse = {
  name: "Web Programlama",
  code: "web-101",
  schoolLat: 41.0082,
  schoolLng: 28.9784,
  allowedRadiusMeters: 100,
  allowedIpRanges: ["10.20.0.0/16", "2001:db8::/32"],
  weeklySessionCount: 3,
  totalWeeks: 9,
  attendanceMode: "STANDARD" as const,
  preparatoryDayPlans: [],
  mandatoryAlertLimit: 4,
};

describe("ders API sözleşmesi", () => {
  it("geçerli girdiyi normalize eder", () => {
    const parsed = createCourseSchema.parse(validCourse);
    expect(parsed.code).toBe("WEB-101");
    expect(parsed.allowedIpRanges).toEqual(["10.20.0.0/16", "2001:db8::/32"]);
  });

  it("geçersiz CIDR ve koordinatları reddeder", () => {
    expect(() =>
      createCourseSchema.parse({
        ...validCourse,
        schoolLat: 120,
        allowedIpRanges: ["okul-wifi"],
      }),
    ).toThrow();
  });

  it("IP kısıtlaması kapalıyken boş aralık listesini kabul eder", () => {
    const parsed = createCourseSchema.parse({
      ...validCourse,
      allowedIpRanges: [],
    });

    expect(parsed.allowedIpRanges).toEqual([]);
  });

  it("yeni derste devamsızlık hakkını zorunlu tutar", () => {
    const withoutLimit: Partial<typeof validCourse> = { ...validCourse };
    delete withoutLimit.mandatoryAlertLimit;
    expect(() => createCourseSchema.parse(withoutLimit)).toThrow();
    expect(() => createCourseSchema.parse({ ...validCourse, mandatoryAlertLimit: null })).toThrow();
  });

  it("boş güncelleme isteğini reddeder", () => {
    expect(() => updateCourseSchema.parse({})).toThrow();
  });

  it("hazırlık sınıfında günlere göre ders sayısı ister", () => {
    const preparatoryDayPlans = [
      { weekday: 1, lessonCount: 8 },
      { weekday: 2, lessonCount: 6 },
      { weekday: 3, lessonCount: 8 },
      { weekday: 4, lessonCount: 4 },
      { weekday: 5, lessonCount: 7 },
    ];
    expect(createCourseSchema.parse({
      ...validCourse,
      attendanceMode: "PREPARATORY",
      weeklySessionCount: 33,
      preparatoryDayPlans,
    }).preparatoryDayPlans).toEqual(preparatoryDayPlans);
    expect(() => createCourseSchema.parse({
      ...validCourse,
      attendanceMode: "PREPARATORY",
      preparatoryDayPlans: [],
    })).toThrow();
  });
});
