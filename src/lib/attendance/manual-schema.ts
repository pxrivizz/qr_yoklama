import { z } from "zod";

export const manualAttendanceSchema = z
  .object({
    weekNumber: z.number().int().min(1).max(52),
    sessionIndexInWeek: z.number().int().min(1).max(10),
    records: z
      .array(
        z
          .object({
            enrollmentId: z.string().min(1).max(64),
            status: z.enum(["PRESENT", "ABSENT"]),
          })
          .strict(),
      )
      .min(1, "Kaydedilecek en az bir öğrenci olmalıdır.")
      .max(2_000, "Tek seferde en fazla 2000 öğrenci kaydedilebilir."),
  })
  .strict();

export type ManualAttendanceInput = z.infer<typeof manualAttendanceSchema>;
