import { requireActualTeacher } from "@/lib/auth/authorization";
import { changePasswordSchema } from "@/lib/auth/account-schema";
import { changeTeacherPassword } from "@/lib/auth/account-service";
import { apiErrorResponse } from "@/lib/http/api-error";
import { enforceRateLimit } from "@/lib/http/rate-limit";
import { readJsonBody } from "@/lib/http/request-body";
import { getRequestContext } from "@/lib/http/request-context";

export async function PATCH(request: Request) {
  try {
    const teacher = await requireActualTeacher();
    enforceRateLimit(`teacher-password:${teacher.id}`, { limit: 5, windowMs: 15 * 60_000 });
    const input = changePasswordSchema.parse(await readJsonBody(request));
    await changeTeacherPassword(teacher.id, input, getRequestContext(request));
    return Response.json({ data: { updated: true } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
