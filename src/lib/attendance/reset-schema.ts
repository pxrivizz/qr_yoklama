import { z } from "zod";

export const resetAttendanceSessionSchema = z
  .object({
    sessionId: z.string().min(1).max(64),
    confirmation: z.literal("SIFIRLA", {
      error: "Devam etmek için SIFIRLA yazın.",
    }),
  })
  .strict();

export type ResetAttendanceSessionInput = z.infer<typeof resetAttendanceSessionSchema>;
