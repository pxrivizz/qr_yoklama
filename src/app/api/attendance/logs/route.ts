import { requireTeacher } from "@/lib/auth/authorization";
import { apiErrorResponse, ApiError } from "@/lib/http/api-error";
import { getQrScanLogs } from "@/lib/attendance/qr-log-service";
import { z } from "zod";

const optionalQueryText = (max: number) =>
  z.preprocess((value) => (value === "" || value === null ? undefined : value), z.string().max(max).optional());

const logsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  courseId: optionalQueryText(64),
  search: optionalQueryText(100),
  startDate: optionalQueryText(32),
  endDate: optionalQueryText(32),
  actionType: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.enum(["YOKLAMA", "GIRIS", "CIKIS"]).optional(),
  ),
  result: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.enum([
      "SUCCESS",
      "INVALID_QR",
      "EXPIRED_QR",
      "DUPLICATE_SCAN",
      "OUT_OF_RADIUS",
      "OUT_OF_NETWORK",
      "NOT_ENROLLED",
      "PHOTO_REQUIRED",
      "ERROR",
    ]).optional(),
  ),
});

export async function GET(request: Request) {
  try {
    const teacher = await requireTeacher();
    const { searchParams } = new URL(request.url);

    const { page, pageSize, courseId, search, startDate, endDate, actionType, result } =
      logsQuerySchema.parse(Object.fromEntries(searchParams));

    const data = await getQrScanLogs({
      teacherId: teacher.id,
      courseId,
      search,
      startDate,
      endDate,
      actionType,
      result,
      page,
      pageSize,
    });

    return Response.json({ data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE() {
  try {
    await requireTeacher();
    throw new ApiError(
      403,
      "LOG_DELETE_FORBIDDEN",
      "QR okutma logları sistem denetim ve güvenlik politikası gereği öğretmenler tarafından silinemez.",
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
