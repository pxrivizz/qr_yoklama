import { z } from "zod";

export const strongPasswordSchema = z
  .string()
  .min(10, "Şifre en az 10 karakter olmalıdır.")
  .max(128, "Şifre en fazla 128 karakter olabilir.")
  .regex(/[a-z]/, "Şifre en az bir küçük harf içermelidir.")
  .regex(/[A-Z]/, "Şifre en az bir büyük harf içermelidir.")
  .regex(/[0-9]/, "Şifre en az bir rakam içermelidir.");

export const createTeacherSchema = z
  .object({
    name: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalıdır.").max(120),
    email: z.string().trim().toLowerCase().pipe(z.email("Geçerli bir e-posta adresi girin.")),
    temporaryPassword: strongPasswordSchema,
  })
  .strict();

export const createAdminSchema = z
  .object({
    name: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalıdır.").max(120),
    email: z.string().trim().toLowerCase().pipe(z.email("Geçerli bir e-posta adresi girin.")),
    temporaryPassword: strongPasswordSchema,
  })
  .strict();

export const resetTeacherPasswordSchema = z
  .object({ temporaryPassword: strongPasswordSchema })
  .strict();

export const deleteTeacherSchema = z
  .object({ confirmationEmail: z.string().trim().toLowerCase().pipe(z.email()) })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mevcut şifrenizi girin.").max(128),
    newPassword: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Yeni şifreyi tekrar girin.").max(128),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.newPassword !== value.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Yeni şifreler eşleşmiyor.",
      });
    }
    if (value.currentPassword === value.newPassword) {
      context.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "Yeni şifre mevcut şifreden farklı olmalıdır.",
      });
    }
  });

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
