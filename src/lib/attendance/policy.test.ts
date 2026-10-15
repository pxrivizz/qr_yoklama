import { describe, expect, it } from "vitest";

import {
  DEFAULT_ATTENDANCE_POLICY,
  resolveAttendancePolicy,
} from "./policy";

describe("attendance policy", () => {
  it("geçersiz veya eski oturum anlık görüntülerinde güvenli varsayılana döner", () => {
    expect(resolveAttendancePolicy({ photoMode: "UNKNOWN" })).toEqual(DEFAULT_ATTENDANCE_POLICY);
  });

  it("yalnızca zorunlu ve kapalı seçeneklerini kabul eder", () => {
    expect(resolveAttendancePolicy({ networkMode: "FLAG_ONLY" })).toEqual(DEFAULT_ATTENDANCE_POLICY);
    expect(resolveAttendancePolicy({ networkMode: "DISABLED" }).networkMode).toBe("DISABLED");
  });
});
