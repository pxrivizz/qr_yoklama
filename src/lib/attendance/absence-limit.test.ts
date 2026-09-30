import { describe, expect, it } from "vitest";

import { calculateAbsenceLimitStatus } from "./absence-limit";

describe("calculateAbsenceLimitStatus", () => {
  it("fails the student as soon as the configured allowance is fully used", () => {
    const status = calculateAbsenceLimitStatus(10, 10, true);

    expect(status.isFailed).toBe(true);
    expect(status.isAtLimit).toBe(true);
    expect(status.remainingAllowance).toBe(0);
    expect(status.limitLevel).toBe("danger");
  });

  it("marks the final remaining allowance as danger without failing early", () => {
    const status = calculateAbsenceLimitStatus(9, 10, true);

    expect(status.isFailed).toBe(false);
    expect(status.isNearLimit).toBe(true);
    expect(status.remainingAllowance).toBe(1);
    expect(status.limitLevel).toBe("danger");
  });

  it("uses warning after half of the allowance has been used", () => {
    expect(calculateAbsenceLimitStatus(5, 10, true).limitLevel).toBe("warning");
    expect(calculateAbsenceLimitStatus(4, 10, true).limitLevel).toBe("safe");
  });

  it("does not apply a limit to exempt students", () => {
    expect(calculateAbsenceLimitStatus(10, 10, false).limitLevel).toBe("none");
  });
});
