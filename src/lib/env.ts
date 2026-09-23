import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),
  QR_SIGNING_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.url(),
  ALLOWED_TEACHER_EMAIL_DOMAIN: z.string().optional(),
  TRUSTED_PROXY_IP_HEADER: z
    .enum(["x-real-ip", "cf-connecting-ip", "x-forwarded-for"])
    .optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (!cachedEnv) {
    cachedEnv = serverEnvSchema.parse(process.env);
  }

  return cachedEnv;
}
