import { requireTeacher } from "@/lib/auth/authorization";
import { addCourseStudent, getCourseStudents } from "@/lib/enrollments/service";
import { apiErrorResponse } from "@/lib/http/api-error";
import { getRequestContext } from "@/lib/http/request-context";
import { createEnrollmentSchema } from "@/lib/enrollments/schema";
import { readJsonBody } from "@/lib/http/request-body";

type RouteContext = {
  params: Promise<{ courseId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const teacher = await requireTeacher();
    const { courseId } = await context.params;
    const data = await getCourseStudents(teacher.id, courseId);
    return Response.json({ data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const teacher = await requireTeacher();
    const { courseId } = await context.params;
    const input = createEnrollmentSchema.parse(await readJsonBody(request));

    const student = await addCourseStudent(
      teacher.id,
      courseId,
      input,
      getRequestContext(request),
    );

    return Response.json({ data: student }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
