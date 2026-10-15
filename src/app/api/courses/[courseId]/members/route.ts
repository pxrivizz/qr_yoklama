import { requireTeacher } from "@/lib/auth/authorization";
import { assignCourseMemberSchema } from "@/lib/courses/member-schema";
import { assignCourseMember, listCourseMembers } from "@/lib/courses/member-service";
import { apiErrorResponse } from "@/lib/http/api-error";
import { getRequestContext } from "@/lib/http/request-context";
import { readJsonBody } from "@/lib/http/request-body";

type Context = { params: Promise<{ courseId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const teacher = await requireTeacher();
    const { courseId } = await context.params;
    return Response.json({ data: await listCourseMembers(teacher.id, courseId) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const teacher = await requireTeacher();
    const { courseId } = await context.params;
    const input = assignCourseMemberSchema.parse(await readJsonBody(request));
    const data = await assignCourseMember(teacher.id, courseId, input, getRequestContext(request));
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
