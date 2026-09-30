import { z } from "zod";

const recordsSchema = z
  .array(
    z
      .object({
        enrollmentId: z.string().min(1).max(64),
        status: z.enum(["PRESENT", "ABSENT"]),
      })
      .strict(),
  )
  .min(1, "Kaydedilecek en az bir öğrenci olmalıdır.")
  .max(2_000, "Tek seferde en fazla 2000 öğrenci kaydedilebilir.");

export const manualAttendanceSchema = z.union([
  z.object({
    weekNumber: z.number().int().min(1).max(52),
    sessionIndexInWeek: z.number().int().min(1).max(10),
    records: recordsSchema,
  }).strict(),
  z.object({
    sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    lessonPeriod: z.number().int().min(1).max(16),
    records: recordsSchema,
  }).strict(),
]);

export type ManualAttendanceInput = z.infer<typeof manualAttendanceSchema>;

export const manualAttendanceSlotSchema = z.union([
  z.object({
    weekNumber: z.coerce.number().int().min(1).max(52),
    sessionIndexInWeek: z.coerce.number().int().min(1).max(10),
  }).strict(),
  z.object({
    sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    lessonPeriod: z.coerce.number().int().min(1).max(16),
  }).strict(),
]);
