import { describe, expect, it } from "vitest";

import { attendanceScanSchema } from "./scan-schema";

const token = "x".repeat(20);

describe("attendanceScanSchema", () => {
  it("konum politikası kapalı oturumlar için koordinatsız taramayı kabul eder", () => {
    expect(attendanceScanSchema.parse({ token })).toEqual({ token });
  });

  it("enlem ve boylamın birlikte gönderilmesini zorunlu tutar", () => {
    expect(() => attendanceScanSchema.parse({ token, latitude: 41 })).toThrow();
    expect(() => attendanceScanSchema.parse({ token, longitude: 29 })).toThrow();
  });

  it("geçerli koordinat çiftini kabul eder", () => {
    expect(attendanceScanSchema.parse({ token, latitude: 41, longitude: 29 })).toMatchObject({
      latitude: 41,
      longitude: 29,
    });
  });
});
