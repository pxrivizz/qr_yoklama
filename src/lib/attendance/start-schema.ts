import { z } from "zod";

const weeklySlotSchema = z
  .object({
    weekNumber: z.number().int().min(1).max(52),
    sessionIndexInWeek: z.number().int().min(1).max(10),
  })
  .strict();

const preparatorySlotSchema = z
  .object({
    sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    lessonPeriod: z.number().int().min(1).max(16),
  })
  .strict();

export const startAttendanceSessionSchema = z.union([
  weeklySlotSchema,
  preparatorySlotSchema,
]);

export type StartAttendanceSessionInput = z.infer<typeof startAttendanceSessionSchema>;
