import { describe, expect, it } from "vitest";

import { studentProfileSchema } from "./profile-schema";

describe("öğrenci profili", () => {
  it.each(["171601013", "2026-001", "ABC_42"])("%s numarasını kabul eder", (schoolNumber) => {
    expect(studentProfileSchema.parse({ schoolNumber })).toEqual({ schoolNumber });
  });

  it.each(["", "12 34", "<script>"])("%s değerini reddeder", (schoolNumber) => {
    expect(studentProfileSchema.safeParse({ schoolNumber }).success).toBe(false);
  });

  it("geçerli fotoğraf kabul eder", () => {
    const valid = { image: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ" };
    expect(studentProfileSchema.parse(valid)).toEqual(valid);
  });

  it("geçersiz veya boş gövdeyi reddeder", () => {
    expect(studentProfileSchema.safeParse({}).success).toBe(false);
    expect(studentProfileSchema.safeParse({ image: "invalid-image" }).success).toBe(false);
    expect(studentProfileSchema.safeParse({ image: "data:image/png;base64," + "a".repeat(3_100_000) }).success).toBe(false);
    expect(studentProfileSchema.safeParse({ image: "https://attacker.example/tracker.png" }).success).toBe(false);
    expect(studentProfileSchema.safeParse({ image: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" }).success).toBe(false);
  });
});
