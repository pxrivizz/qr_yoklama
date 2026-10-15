import { z } from "zod";

export const attendanceScanSchema = z
  .object({
    token: z.string().min(20, "QR kodu geçersiz.").max(2_048),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    accuracyMeters: z.number().nonnegative().max(5_000).optional(),
    scanSource: z.string().trim().max(80).optional(),
    targetCourseId: z.string().trim().min(1).max(64).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.latitude === undefined) !== (value.longitude === undefined)) {
      context.addIssue({
        code: "custom",
        path: value.latitude === undefined ? ["latitude"] : ["longitude"],
        message: "Enlem ve boylam birlikte gönderilmelidir.",
      });
    }
  });

export type AttendanceScanInput = z.infer<typeof attendanceScanSchema>;
