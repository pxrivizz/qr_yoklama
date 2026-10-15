import { z } from "zod";

export const assignCourseMemberSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  role: z.enum(["INSTRUCTOR", "ASSISTANT"]),
}).strict();

export const updateCourseMemberSchema = z.object({
  role: z.enum(["INSTRUCTOR", "ASSISTANT"]),
}).strict();
