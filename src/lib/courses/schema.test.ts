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

  it("boş güncelleme isteğini reddeder", () => {
    expect(() => updateCourseSchema.parse({})).toThrow();
  });
});
