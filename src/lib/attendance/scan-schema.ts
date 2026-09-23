import { z } from "zod";

export const attendanceScanSchema = z
  .object({
    token: z.string().min(20, "QR kodu geçersiz.").max(2_048),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracyMeters: z.number().nonnegative().max(5_000).optional(),
    scanSource: z.string().trim().max(80).optional(),
    targetCourseId: z.string().trim().min(1).max(64).optional(),
  })
  .strict();

export type AttendanceScanInput = z.infer<typeof attendanceScanSchema>;
