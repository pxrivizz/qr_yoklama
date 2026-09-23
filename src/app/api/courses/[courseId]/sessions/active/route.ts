import { requireTeacher } from "@/lib/auth/authorization";
import {
  getActiveSessionState,
  startAttendanceSession,
} from "@/lib/attendance/session-service";
import { apiErrorResponse } from "@/lib/http/api-error";
import { getRequestContext } from "@/lib/http/request-context";
import { startAttendanceSessionSchema } from "@/lib/attendance/start-schema";
import { readJsonBody } from "@/lib/http/request-body";

type RouteContext = { params: Promise<{ courseId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const teacher = await requireTeacher();
    const { courseId } = await context.params;
    const state = await getActiveSessionState(teacher.id, courseId);
    return Response.json({ data: state });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const teacher = await requireTeacher();
    const { courseId } = await context.params;
    const input = startAttendanceSessionSchema.parse(await readJsonBody(request));
    const state = await startAttendanceSession(
      teacher.id,
      courseId,
      input,
      getRequestContext(request),
    );
    return Response.json({ data: state }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const teacher = await requireTeacher();
    const { courseId } = await context.params;
    const { closeAttendanceSession } = await import("@/lib/attendance/session-service");
    await closeAttendanceSession(teacher.id, courseId, getRequestContext(request));
    return Response.json({ data: { closed: true } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
