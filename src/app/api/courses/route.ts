import { requireTeacher } from "@/lib/auth/authorization";
import { createCourseSchema } from "@/lib/courses/schema";
import {
  createTeacherCourse,
  listTeacherCourses,
} from "@/lib/courses/service";
import { apiErrorResponse } from "@/lib/http/api-error";
import { getRequestContext } from "@/lib/http/request-context";
import { readJsonBody } from "@/lib/http/request-body";

export async function GET() {
  try {
    const teacher = await requireTeacher();
    const courses = await listTeacherCourses(teacher.id);
    return Response.json({ data: courses });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const teacher = await requireTeacher();
    const input = createCourseSchema.parse(await readJsonBody(request));
    const course = await createTeacherCourse(
      teacher.id,
      input,
      getRequestContext(request),
    );
    return Response.json({ data: course }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
