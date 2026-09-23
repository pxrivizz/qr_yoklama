import { z } from "zod";

const fullName = z
  .string()
  .trim()
  .min(2, "Ad soyad en az 2 karakter olmalıdır.")
  .max(160, "Ad soyad en fazla 160 karakter olabilir.")
  .regex(/^[\p{L}\p{M} .'-]+$/u, "Ad soyad geçersiz karakter içeriyor.");

const schoolNumber = z
  .string()
  .trim()
  .min(1, "Öğrenci numarası zorunludur.")
  .max(40, "Öğrenci numarası en fazla 40 karakter olabilir.")
  .regex(/^[\p{L}\p{N}._-]+$/u, "Öğrenci numarası geçersiz karakter içeriyor.");

export const createEnrollmentSchema = z
  .object({
    fullName,
    schoolNumber,
    isMandatory: z.boolean(),
  })
  .strict();

export const updateEnrollmentSchema = z
  .object({
    fullName: fullName.optional(),
    schoolNumber: schoolNumber.optional(),
    isMandatory: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Güncellenecek en az bir alan gönderilmelidir.",
  });
