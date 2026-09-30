import { requireUser } from "@/lib/auth/authorization";
import { getBugReportScreenshotMeta } from "@/lib/bug-reports/service";
import { readBugScreenshot } from "@/lib/bug-reports/storage";
import { apiErrorResponse, ApiError } from "@/lib/http/api-error";

export const runtime = "nodejs";

type Context = { params: Promise<{ reportId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { reportId } = await context.params;
    const report = await getBugReportScreenshotMeta(reportId);
    const canView = report.reporterId === user.id || user.role === "ADMIN" || user.role === "TEACHER";
    if (!canView) {
      throw new ApiError(403, "BUG_REPORT_SCREENSHOT_FORBIDDEN", "Bu ekran görüntüsünü görüntüleme yetkiniz yok.");
    }
    const screenshot = await readBugScreenshot(report.screenshotPath);
    return new Response(screenshot, {
      headers: {
        "content-type": report.screenshotMimeType,
        "cache-control": "private, no-store",
        "content-disposition": `inline; filename="hata-${report.id}"`,
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
