import { requireUser } from "@/lib/auth/authorization";
import { listBugReportsForReporter } from "@/lib/bug-reports/service";
import { apiErrorResponse } from "@/lib/http/api-error";

export async function GET() {
  try {
    const user = await requireUser();
    return Response.json({ data: { reports: await listBugReportsForReporter(user.id) } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
