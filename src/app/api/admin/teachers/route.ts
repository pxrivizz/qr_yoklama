import { requireAdmin } from "@/lib/auth/authorization";
import { createTeacherSchema } from "@/lib/auth/account-schema";
import { createTeacher, listTeachers } from "@/lib/admin/service";
import { apiErrorResponse } from "@/lib/http/api-error";
import { enforceRateLimit } from "@/lib/http/rate-limit";
import { readJsonBody } from "@/lib/http/request-body";
import { getRequestContext } from "@/lib/http/request-context";

export async function GET() {
  try {
    await requireAdmin();
    const teachers = await listTeachers();
    return Response.json({ data: teachers });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    enforceRateLimit(`admin-create-teacher:${admin.id}`, { limit: 10, windowMs: 60_000 });
    const input = createTeacherSchema.parse(await readJsonBody(request));
    const teacher = await createTeacher(admin.id, input, getRequestContext(request));
    return Response.json({ data: teacher }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
