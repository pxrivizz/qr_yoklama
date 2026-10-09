import { createAdmin, listAdmins } from "@/lib/admin/service";
import { createAdminSchema } from "@/lib/auth/account-schema";
import { requireAdmin } from "@/lib/auth/authorization";
import { apiErrorResponse } from "@/lib/http/api-error";
import { enforceRateLimit } from "@/lib/http/rate-limit";
import { readJsonBody } from "@/lib/http/request-body";
import { getRequestContext } from "@/lib/http/request-context";

export async function GET() {
  try {
    await requireAdmin();
    const admins = await listAdmins();
    return Response.json({ data: admins });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    enforceRateLimit(`admin-create-admin:${admin.id}`, { limit: 5, windowMs: 60_000 });
    const input = createAdminSchema.parse(await readJsonBody(request));
    const createdAdmin = await createAdmin(admin.id, input, getRequestContext(request));
    return Response.json({ data: createdAdmin }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
