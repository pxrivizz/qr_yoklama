import { requireSupportStaff } from "@/lib/auth/authorization";
import { bugReportResponseSchema } from "@/lib/bug-reports/schema";
import { addBugReportResponse } from "@/lib/bug-reports/service";
import { apiErrorResponse } from "@/lib/http/api-error";
import { enforceRateLimit } from "@/lib/http/rate-limit";
import { readJsonBody } from "@/lib/http/request-body";

type Context = { params: Promise<{ reportId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const staff = await requireSupportStaff();
    enforceRateLimit(`bug-response:${staff.id}`, { limit: 30, windowMs: 60_000 });
    const { reportId } = await context.params;
    const input = bugReportResponseSchema.parse(await readJsonBody(request));
    return Response.json({
      data: await addBugReportResponse({ reportId, authorId: staff.id, message: input.message }),
    }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
