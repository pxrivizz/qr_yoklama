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

const preparatoryDayPlanSchema = z.object({
  weekday: z.number().int().min(1).max(5),
  lessonCount: z.number().int().min(0).max(16),
}).strict();

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
  // An empty list explicitly disables the school-network restriction.
  allowedIpRanges: z.array(cidrSchema).max(20),
  weeklySessionCount: z.number().int().min(1).max(112),
  totalWeeks: z.number().int().min(1).max(52),
  attendanceMode: z.enum(["STANDARD", "PREPARATORY"]),
  preparatoryDayPlans: z.array(preparatoryDayPlanSchema).max(7),
  mandatoryAlertLimit: z.number().int().min(1).max(100),
};

function validateAttendanceMode(
  value: {
    attendanceMode?: "STANDARD" | "PREPARATORY";
    preparatoryDayPlans?: Array<{ weekday: number; lessonCount: number }>;
    weeklySessionCount?: number;
  },
  context: z.RefinementCtx,
) {
  if (value.attendanceMode === "STANDARD" && (value.preparatoryDayPlans?.length ?? 0) > 0) {
    context.addIssue({
      code: "custom",
      path: ["preparatoryDayPlans"],
      message: "Normal derslerde hazırlık sınıfı programı kullanılmaz.",
    });
  }
  if (value.attendanceMode === "STANDARD" && (value.weeklySessionCount ?? 0) > 10) {
    context.addIssue({
      code: "custom",
      path: ["weeklySessionCount"],
      message: "Normal derslerde haftalık yoklama 1 ile 10 arasında olmalıdır.",
    });
  }
  if (value.attendanceMode === "PREPARATORY") {
    const plans = value.preparatoryDayPlans ?? [];
    const weekdays = new Set(plans.map((plan) => plan.weekday));
    if (plans.length !== 5 || weekdays.size !== 5) {
      context.addIssue({
        code: "custom",
        path: ["preparatoryDayPlans"],
        message: "Hazırlık programında hafta içindeki her gün bir kez tanımlanmalıdır.",
      });
    }
    const weeklyTotal = plans.reduce((total, plan) => total + plan.lessonCount, 0);
    if (weeklyTotal === 0) {
      context.addIssue({
        code: "custom",
        path: ["preparatoryDayPlans"],
        message: "Hazırlık programında en az bir gün için ders sayısı girin.",
      });
    }
  }
}

export const createCourseSchema = z.object(courseFields).strict().superRefine(validateAttendanceMode);

export const updateCourseSchema = z
  .object(courseFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Güncellenecek en az bir alan gönderilmelidir.",
  })
  .superRefine(validateAttendanceMode);

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
