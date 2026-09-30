import {
  createManualAttendanceSession,
  getManualAttendanceSlot,
} from "@/lib/attendance/session-service";
import {
  manualAttendanceSchema,
  manualAttendanceSlotSchema,
} from "@/lib/attendance/manual-schema";
import { requireTeacher } from "@/lib/auth/authorization";
import { apiErrorResponse } from "@/lib/http/api-error";
import { getRequestContext } from "@/lib/http/request-context";
import { readJsonBody } from "@/lib/http/request-body";

type Context = { params: Promise<{ courseId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const teacher = await requireTeacher();
    const { courseId } = await context.params;
    const url = new URL(request.url);
    const sessionDate = url.searchParams.get("sessionDate");
    const slot = manualAttendanceSlotSchema.parse(
      sessionDate
        ? {
            sessionDate,
            lessonPeriod: url.searchParams.get("lessonPeriod"),
          }
        : {
            weekNumber: url.searchParams.get("weekNumber"),
            sessionIndexInWeek: url.searchParams.get("sessionIndexInWeek"),
          },
    );
    const data = await getManualAttendanceSlot(teacher.id, courseId, slot);
    return Response.json({ data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

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
    return Response.json({
      data: {
        sessionId: session.id,
        status: session.status,
        createdBy: session.createdBy,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
