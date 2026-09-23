import { createManualAttendanceSession } from "@/lib/attendance/session-service";
import { manualAttendanceSchema } from "@/lib/attendance/manual-schema";
import { requireTeacher } from "@/lib/auth/authorization";
import { apiErrorResponse } from "@/lib/http/api-error";
import { getRequestContext } from "@/lib/http/request-context";
import { readJsonBody } from "@/lib/http/request-body";

type Context = { params: Promise<{ courseId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const teacher = await requireTeacher();
    const { courseId } = await context.params;
    const input = manualAttendanceSchema.parse(await readJsonBody(request, 512 * 1024));
    const session = await createManualAttendanceSession(
      teacher.id,
      courseId,
      input,
      getRequestContext(request),
    );
    return Response.json({ data: { sessionId: session.id } }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
