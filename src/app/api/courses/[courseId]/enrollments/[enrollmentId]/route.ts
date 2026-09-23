import { requireTeacher } from "@/lib/auth/authorization";
import {
  deleteCourseStudent,
  updateCourseStudent,
} from "@/lib/enrollments/service";
import { apiErrorResponse } from "@/lib/http/api-error";
import { getRequestContext } from "@/lib/http/request-context";
import { updateEnrollmentSchema } from "@/lib/enrollments/schema";
import { readJsonBody } from "@/lib/http/request-body";

type RouteContext = {
  params: Promise<{ courseId: string; enrollmentId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const teacher = await requireTeacher();
    const { courseId, enrollmentId } = await context.params;
    const data = updateEnrollmentSchema.parse(await readJsonBody(request));

    const updated = await updateCourseStudent(
      teacher.id,
      courseId,
      enrollmentId,
      data,
      getRequestContext(request),
    );

    return Response.json({ data: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const teacher = await requireTeacher();
    const { courseId, enrollmentId } = await context.params;

    await deleteCourseStudent(
      teacher.id,
      courseId,
      enrollmentId,
      getRequestContext(request),
    );

    return new Response(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
