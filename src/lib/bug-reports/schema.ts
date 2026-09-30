import { z } from "zod";

export const bugReportFieldsSchema = z.object({
  subject: z.string().trim().min(3, "Konu en az 3 karakter olmalıdır.").max(120),
  description: z
    .string()
    .trim()
    .min(10, "Hatayı yeniden oluşturabilmemiz için biraz daha ayrıntı yazın.")
    .max(3_000),
  pageUrl: z.string().trim().max(2_048).optional(),
});

export const bugReportListSchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(["PENDING", "IN_PROGRESS", "FIXED"]).optional(),
});

export const bugReportStatusSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "FIXED"]),
});

export const bugReportResponseSchema = z.object({
  message: z
    .string()
    .trim()
    .min(2, "Yanıt en az 2 karakter olmalıdır.")
    .max(3_000, "Yanıt 3.000 karakterden uzun olamaz."),
});
