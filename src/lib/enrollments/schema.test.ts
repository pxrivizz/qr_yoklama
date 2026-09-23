import { describe, expect, it } from "vitest";

import { createEnrollmentSchema, updateEnrollmentSchema } from "./schema";

describe("öğrenci kayıt şemaları", () => {
  it("geçerli kayıtları normalize eder", () => {
    expect(
      createEnrollmentSchema.parse({
        fullName: "  Ayşe Yılmaz  ",
        schoolNumber: " 2026-001 ",
        isMandatory: false,
      }),
    ).toEqual({ fullName: "Ayşe Yılmaz", schoolNumber: "2026-001", isMandatory: false });
  });

  it("string boolean ve ek alanları reddeder", () => {
    expect(
      createEnrollmentSchema.safeParse({
        fullName: "Ayşe Yılmaz",
        schoolNumber: "2026-001",
        isMandatory: "false",
      }).success,
    ).toBe(false);
    expect(updateEnrollmentSchema.safeParse({ isMandatory: true, role: "TEACHER" }).success).toBe(false);
  });
});
