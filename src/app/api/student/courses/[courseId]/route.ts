import { requireStudent } from "@/lib/auth/authorization";
import { apiErrorResponse } from "@/lib/http/api-error";
import { getStudentCourseAttendanceDetail } from "@/lib/students/attendance-service";

type RouteContext = { params: Promise<{ courseId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const student = await requireStudent();
    const { courseId } = await context.params;
    const data = await getStudentCourseAttendanceDetail(student.id, courseId);
    return Response.json({ data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
