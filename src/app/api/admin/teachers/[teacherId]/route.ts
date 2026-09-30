import { requireAdmin } from "@/lib/auth/authorization";
import { deleteTeacherSchema, resetTeacherPasswordSchema } from "@/lib/auth/account-schema";
import { deleteTeacher, resetTeacherPassword } from "@/lib/admin/service";
import { apiErrorResponse } from "@/lib/http/api-error";
import { enforceRateLimit } from "@/lib/http/rate-limit";
import { readJsonBody } from "@/lib/http/request-body";
import { getRequestContext } from "@/lib/http/request-context";

type RouteContext = { params: Promise<{ teacherId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    const { teacherId } = await context.params;
    enforceRateLimit(`admin-reset-password:${admin.id}`, { limit: 10, windowMs: 60_000 });
    const input = resetTeacherPasswordSchema.parse(await readJsonBody(request));
    await resetTeacherPassword(
      admin.id,
      teacherId,
      input.temporaryPassword,
      getRequestContext(request),
    );
    return Response.json({ data: { updated: true } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    const { teacherId } = await context.params;
    enforceRateLimit(`admin-delete-teacher:${admin.id}`, { limit: 5, windowMs: 60_000 });
    const input = deleteTeacherSchema.parse(await readJsonBody(request));
    await deleteTeacher(admin.id, teacherId, input.confirmationEmail, getRequestContext(request));
    return Response.json({ data: { deleted: true } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
