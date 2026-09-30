import { describe, expect, it } from "vitest";

import { resetAttendanceSessionSchema } from "./reset-schema";

describe("resetAttendanceSessionSchema", () => {
  const validInput = { sessionId: "session-1", confirmation: "SIFIRLA" };

  it("requires a valid slot and the exact destructive action confirmation", () => {
    expect(resetAttendanceSessionSchema.safeParse(validInput).success).toBe(true);
    expect(resetAttendanceSessionSchema.safeParse({ ...validInput, confirmation: "sıfırla" }).success).toBe(false);
    expect(resetAttendanceSessionSchema.safeParse({ ...validInput, sessionId: "" }).success).toBe(false);
    expect(resetAttendanceSessionSchema.safeParse({ ...validInput, extra: true }).success).toBe(false);
  });
});
