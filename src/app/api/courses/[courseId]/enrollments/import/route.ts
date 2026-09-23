import { requireTeacher } from "@/lib/auth/authorization";
import { parseEnrollmentWorkbookDetails } from "@/lib/enrollments/excel-parser";
import { importEnrollments } from "@/lib/enrollments/service";
import { readEnrollmentExcelFile } from "@/lib/enrollments/upload";
import { apiErrorResponse } from "@/lib/http/api-error";
import { getRequestContext } from "@/lib/http/request-context";

export const runtime = "nodejs";

type Context = { params: Promise<{ courseId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const teacher = await requireTeacher();
    const { courseId } = await context.params;
    const file = await readEnrollmentExcelFile(request);
    const workbook = await parseEnrollmentWorkbookDetails(await file.arrayBuffer());
    const summary = await importEnrollments(
      teacher.id,
      courseId,
      workbook.rows,
      getRequestContext(request),
    );
    return Response.json({ data: summary }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
