import { z } from "zod";

const MAX_PHOTO_DATA_URL_LENGTH = 2_800_000;
const SAFE_RASTER_DATA_URL = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export const studentProfileSchema = z
  .object({
    schoolNumber: z
      .string()
      .trim()
      .min(1, "Öğrenci numaranızı yazın.")
      .max(40, "Öğrenci numarası en fazla 40 karakter olabilir.")
      .regex(/^[\p{L}\p{N}._-]+$/u, "Öğrenci numarası geçersiz karakter içeriyor.")
      .optional(),
    image: z
      .string()
      .min(1, "Fotoğraf verisi boş olamaz.")
      .max(MAX_PHOTO_DATA_URL_LENGTH, "Fotoğraf boyutu en fazla 2 MB olabilir.")
      .refine(
        (value) => SAFE_RASTER_DATA_URL.test(value),
        { message: "Fotoğraf JPEG, PNG veya WebP biçiminde olmalıdır." },
      )
      .optional(),
  })
  .refine((data) => Boolean(data.schoolNumber || data.image), {
    message: "En az bir güncelleme alanı belirtilmelidir.",
  });

export type StudentProfileInput = z.infer<typeof studentProfileSchema>;
