import ipaddr from "ipaddr.js";
import { z } from "zod";

const cidrSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => {
    try {
      ipaddr.parseCIDR(value);
      return true;
    } catch {
      return false;
    }
  }, "Geçerli bir IPv4 veya IPv6 CIDR aralığı girin.");

const courseFields = {
  name: z.string().trim().min(2).max(120),
  code: z
    .string()
    .trim()
    .min(2)
    .max(24)
    .transform((value) => value.toLocaleUpperCase("tr-TR"))
    .pipe(z.string().regex(/^[A-Z0-9ÇĞİÖŞÜ_-]+$/u)),
  schoolLat: z.number().min(-90).max(90),
  schoolLng: z.number().min(-180).max(180),
  allowedRadiusMeters: z.number().int().min(10).max(2_000),
  allowedIpRanges: z.array(cidrSchema).min(1).max(20),
  weeklySessionCount: z.number().int().min(1).max(10),
  totalWeeks: z.number().int().min(1).max(52),
  mandatoryAlertLimit: z.number().int().min(1).max(100).nullable().optional(),
};

export const createCourseSchema = z.object(courseFields).strict();

export const updateCourseSchema = z
  .object(courseFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Güncellenecek en az bir alan gönderilmelidir.",
  });

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
