import { requireSupportStaff, requireUser } from "@/lib/auth/authorization";
import { bugReportFieldsSchema, bugReportListSchema } from "@/lib/bug-reports/schema";
import { createBugReport, listBugReports } from "@/lib/bug-reports/service";
import { removeBugScreenshot, saveBugScreenshot } from "@/lib/bug-reports/storage";
import { apiErrorResponse, ApiError } from "@/lib/http/api-error";
import { enforceRateLimit } from "@/lib/http/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let savedFileName: string | undefined;
  try {
    const user = await requireUser();
    enforceRateLimit(`bug-report:${user.id}`, { limit: 5, windowMs: 60 * 60_000 });

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 7 * 1024 * 1024) {
      throw new ApiError(413, "BUG_REPORT_TOO_LARGE", "Hata bildirimi 7 MB sınırını aşıyor.");
    }

    const form = await request.formData();
    const input = bugReportFieldsSchema.parse({
      subject: form.get("subject"),
      description: form.get("description"),
      pageUrl: form.get("pageUrl") || undefined,
    });
    const screenshot = form.get("screenshot");
    if (!(screenshot instanceof File)) {
      throw new ApiError(422, "SCREENSHOT_REQUIRED", "Lütfen hatayı gösteren bir ekran görüntüsü ekleyin.");
    }

    const saved = await saveBugScreenshot(screenshot);
    savedFileName = saved.fileName;
    const report = await createBugReport({
      reporterId: user.id,
      subject: input.subject,
      description: input.description,
      screenshotPath: saved.fileName,
      screenshotMimeType: saved.mimeType,
      pageUrl: input.pageUrl,
      userAgent: request.headers.get("user-agent")?.slice(0, 1_000),
    });

    return Response.json({ data: report }, { status: 201 });
  } catch (error) {
    if (savedFileName) await removeBugScreenshot(savedFileName);
    return apiErrorResponse(error);
  }
}

export async function GET(request: Request) {
  try {
    await requireSupportStaff();
    const url = new URL(request.url);
    const query = bugReportListSchema.parse(Object.fromEntries(url.searchParams));
    return Response.json({ data: await listBugReports(query) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
