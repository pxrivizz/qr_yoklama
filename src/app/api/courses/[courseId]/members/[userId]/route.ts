import { requireTeacher } from "@/lib/auth/authorization";
import { updateCourseMemberSchema } from "@/lib/courses/member-schema";
import { removeCourseMember, updateCourseMember } from "@/lib/courses/member-service";
import { apiErrorResponse } from "@/lib/http/api-error";
import { getRequestContext } from "@/lib/http/request-context";
import { readJsonBody } from "@/lib/http/request-body";

type Context = { params: Promise<{ courseId: string; userId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const teacher = await requireTeacher();
    const { courseId, userId } = await context.params;
    const input = updateCourseMemberSchema.parse(await readJsonBody(request));
    return Response.json({
      data: await updateCourseMember(
        teacher.id,
        courseId,
        userId,
        input.role,
        getRequestContext(request),
      ),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const teacher = await requireTeacher();
    const { courseId, userId } = await context.params;
    await removeCourseMember(teacher.id, courseId, userId, getRequestContext(request));
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
