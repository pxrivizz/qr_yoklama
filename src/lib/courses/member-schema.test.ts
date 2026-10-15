import { describe, expect, it } from "vitest";

import { assignCourseMemberSchema } from "./member-schema";

describe("course member schema", () => {
  it("öğretim elemanı ve asistan rollerini kabul eder", () => {
    expect(assignCourseMemberSchema.parse({ email: "hoca@example.com", role: "INSTRUCTOR" }).role)
      .toBe("INSTRUCTOR");
    expect(assignCourseMemberSchema.parse({ email: "asistan@example.com", role: "ASSISTANT" }).role)
      .toBe("ASSISTANT");
  });

  it("görüntüleyici rolünü kabul etmez", () => {
    expect(() => assignCourseMemberSchema.parse({ email: "izleyici@example.com", role: "VIEWER" }))
      .toThrow();
  });
});
