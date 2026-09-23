import { z } from "zod";

export const startAttendanceSessionSchema = z
  .object({
    weekNumber: z.number().int().min(1).max(52),
    sessionIndexInWeek: z.number().int().min(1).max(10),
  })
  .strict();

export type StartAttendanceSessionInput = z.infer<typeof startAttendanceSessionSchema>;
