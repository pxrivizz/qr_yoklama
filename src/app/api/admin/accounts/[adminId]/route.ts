import { deleteAdminSchema } from "@/lib/auth/account-schema";
import { requireAdmin } from "@/lib/auth/authorization";
import { removeAdminAccess } from "@/lib/admin/service";
import { apiErrorResponse } from "@/lib/http/api-error";
import { enforceRateLimit } from "@/lib/http/rate-limit";
import { readJsonBody } from "@/lib/http/request-body";
import { getRequestContext } from "@/lib/http/request-context";

type AdminAccountRouteContext = { params: Promise<{ adminId: string }> };

export async function DELETE(
  request: Request,
  context: AdminAccountRouteContext,
) {
  try {
    const admin = await requireAdmin();
    const { adminId } = await context.params;
    enforceRateLimit(`admin-remove-admin:${admin.id}`, { limit: 5, windowMs: 60_000 });
    const input = deleteAdminSchema.parse(await readJsonBody(request));
    const data = await removeAdminAccess(
      admin.id,
      adminId,
      input.confirmationEmail,
      getRequestContext(request),
    );
    return Response.json({ data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
