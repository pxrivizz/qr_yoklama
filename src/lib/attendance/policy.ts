import { z } from "zod";

export const verificationModeSchema = z.enum(["REQUIRED", "DISABLED"]);

export const attendancePolicySchema = z.object({
  photoMode: verificationModeSchema.default("REQUIRED"),
  networkMode: verificationModeSchema.default("REQUIRED"),
  locationMode: verificationModeSchema.default("REQUIRED"),
  deviceMode: verificationModeSchema.default("REQUIRED"),
  maxLocationAccuracyMeters: z.number().int().min(10).max(5_000).nullable().default(null),
  lateAfterMinutes: z.number().int().min(1).max(240).nullable().default(null),
}).strict();

export type AttendancePolicy = z.infer<typeof attendancePolicySchema>;
export const DEFAULT_ATTENDANCE_POLICY: AttendancePolicy = {
  photoMode: "REQUIRED",
  networkMode: "REQUIRED",
  locationMode: "REQUIRED",
  deviceMode: "REQUIRED",
  maxLocationAccuracyMeters: null,
  lateAfterMinutes: null,
};

export function resolveAttendancePolicy(value: unknown): AttendancePolicy {
  const parsed = attendancePolicySchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_ATTENDANCE_POLICY;
}
