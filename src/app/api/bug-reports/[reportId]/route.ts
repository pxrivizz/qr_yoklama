import { requireSupportStaff } from "@/lib/auth/authorization";
import { bugReportStatusSchema } from "@/lib/bug-reports/schema";
import { updateBugReportStatus } from "@/lib/bug-reports/service";
import { apiErrorResponse } from "@/lib/http/api-error";
import { readJsonBody } from "@/lib/http/request-body";

type Context = { params: Promise<{ reportId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const staff = await requireSupportStaff();
    const { reportId } = await context.params;
    const input = bugReportStatusSchema.parse(await readJsonBody(request));
    return Response.json({
      data: await updateBugReportStatus({ reportId, status: input.status, handledById: staff.id }),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
