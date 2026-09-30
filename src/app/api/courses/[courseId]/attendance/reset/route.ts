import { requireTeacher } from "@/lib/auth/authorization";
import { resetAttendanceSession } from "@/lib/attendance/session-service";
import { resetAttendanceSessionSchema } from "@/lib/attendance/reset-schema";
import { apiErrorResponse } from "@/lib/http/api-error";
import { enforceRateLimit } from "@/lib/http/rate-limit";
import { readJsonBody } from "@/lib/http/request-body";
import { getRequestContext } from "@/lib/http/request-context";

type RouteContext = { params: Promise<{ courseId: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const teacher = await requireTeacher();
    const { courseId } = await context.params;
    enforceRateLimit(`attendance-reset:${teacher.id}:${courseId}`, {
      limit: 3,
      windowMs: 60_000,
    });
    const input = resetAttendanceSessionSchema.parse(await readJsonBody(request));

    const deleted = await resetAttendanceSession(
      teacher.id,
      courseId,
      input,
      getRequestContext(request),
    );

    return Response.json({ data: { reset: true, deleted } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
