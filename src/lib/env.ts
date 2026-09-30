import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  QR_SIGNING_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.url(),
  ALLOWED_TEACHER_EMAIL_DOMAIN: z.string().optional(),
  ALLOWED_TEACHER_EMAILS: z.string().optional(),
  AUTH_TRUST_HOST: z.enum(["true", "false"]).default("false"),
  TRUSTED_PROXY_IP_HEADER: z
    .enum(["x-real-ip", "cf-connecting-ip", "x-forwarded-for", ""])
    .transform((val) => (val === "" ? undefined : val))
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
