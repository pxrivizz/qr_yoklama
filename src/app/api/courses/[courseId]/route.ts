import { requireTeacher } from "@/lib/auth/authorization";
import { updateCourseSchema } from "@/lib/courses/schema";
import {
  deleteTeacherCourse,
  getTeacherCourse,
  updateTeacherCourse,
} from "@/lib/courses/service";
import { apiErrorResponse } from "@/lib/http/api-error";
import { getRequestContext } from "@/lib/http/request-context";
import { readJsonBody } from "@/lib/http/request-body";

type CourseRouteContext = {
  params: Promise<{ courseId: string }>;
};

export async function GET(
  _request: Request,
  context: CourseRouteContext,
) {
  try {
    const teacher = await requireTeacher();
    const { courseId } = await context.params;
    return Response.json({ data: await getTeacherCourse(teacher.id, courseId) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: CourseRouteContext,
) {
  try {
    const teacher = await requireTeacher();
    const { courseId } = await context.params;
    const input = updateCourseSchema.parse(await readJsonBody(request));
    const course = await updateTeacherCourse(
      teacher.id,
      courseId,
      input,
      getRequestContext(request),
    );
    return Response.json({ data: course });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  context: CourseRouteContext,
) {
  try {
    const teacher = await requireTeacher();
    const { courseId } = await context.params;
    await deleteTeacherCourse(teacher.id, courseId, getRequestContext(request));
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
