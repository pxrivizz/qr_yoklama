import { describe, expect, it } from "vitest";

import {
  absenceContribution,
  countsAsAttended,
  scanAttendanceStatus,
} from "./status";

describe("attendance status semantics", () => {
  it("counts present-like states consistently", () => {
    expect(countsAsAttended("PRESENT")).toBe(true);
    expect(countsAsAttended("LATE")).toBe(true);
    expect(countsAsAttended("FLAGGED")).toBe(true);
    expect(countsAsAttended("ABSENT")).toBe(false);
    expect(absenceContribution("EXCUSED")).toBe(0);
    expect(absenceContribution("ABSENT")).toBe(1);
  });

  it("marks late scans deterministically", () => {
    const startedAt = new Date("2026-10-15T10:00:00Z");
    expect(scanAttendanceStatus(startedAt, 10, new Date("2026-10-15T10:11:00Z"))).toBe("LATE");
    expect(scanAttendanceStatus(startedAt, 10, new Date("2026-10-15T10:01:00Z"))).toBe("PRESENT");
  });
});
