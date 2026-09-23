import { attendanceScanSchema } from "@/lib/attendance/scan-schema";
import { inspectAttendanceToken, recordAttendanceScan } from "@/lib/attendance/scan-service";
import { createQrScanLog } from "@/lib/attendance/qr-log-service";
import { requireStudent } from "@/lib/auth/authorization";
import { ApiError, apiErrorResponse } from "@/lib/http/api-error";
import { getRequestContext } from "@/lib/http/request-context";
import type { QrScanResult } from "@/generated/prisma/client";
import { readJsonBody } from "@/lib/http/request-body";
import { enforceRateLimit } from "@/lib/http/rate-limit";
import { z } from "zod";

const inspectQuerySchema = z.object({
  token: z.string().min(20, "QR kodu geçersiz.").max(2_048),
  expectedCourseId: z.string().min(1).max(64).optional(),
});

export async function GET(request: Request) {
  let student;
  try {
    student = await requireStudent();
    enforceRateLimit(`attendance-inspect:${student.id}`, { limit: 60, windowMs: 60_000 });
    const url = new URL(request.url);
    const { token, expectedCourseId } = inspectQuerySchema.parse({
      token: url.searchParams.get("token") ?? "",
      expectedCourseId: url.searchParams.get("expectedCourseId") || undefined,
    });
    try {
      return Response.json({
        data: await inspectAttendanceToken(token, expectedCourseId, student.id),
      });
    } catch (inspectError) {
      const context = getRequestContext(request);
      let result: QrScanResult = "INVALID_QR";
      let resultMessage = "QR kod ön kontrolü başarısız: Geçersiz veya süresi dolmuş kod.";

      if (inspectError instanceof ApiError) {
        resultMessage = inspectError.message;
        if (inspectError.code === "QR_EXPIRED") {
          result = "EXPIRED_QR";
        } else if (inspectError.code === "ALREADY_RECORDED") {
          result = "DUPLICATE_SCAN";
        } else if (inspectError.code === "STUDENT_NOT_ENROLLED") {
          result = "NOT_ENROLLED";
        } else if (inspectError.code === "COURSE_MISMATCH") {
          result = "INVALID_QR";
        }
      }

      await createQrScanLog({
        courseId: expectedCourseId,
        userId: student.id,
        studentName: student.name ?? student.email,
        studentNumber: student.schoolNumber,
        scannedBy: student.name ?? student.email,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        actionType: "YOKLAMA",
        result,
        resultMessage,
      });
      throw inspectError;
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const student = await requireStudent();
    enforceRateLimit(`attendance-record:${student.id}`, { limit: 20, windowMs: 60_000 });
    const input = attendanceScanSchema.parse(await readJsonBody(request));
    const data = await recordAttendanceScan(student.id, input, getRequestContext(request));
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
