import { requireTeacher } from "@/lib/auth/authorization";
import { parseEnrollmentWorkbookDetails } from "@/lib/enrollments/excel-parser";
import { previewEnrollments } from "@/lib/enrollments/service";
import { readEnrollmentExcelFile } from "@/lib/enrollments/upload";
import { apiErrorResponse } from "@/lib/http/api-error";

export const runtime = "nodejs";

type Context = { params: Promise<{ courseId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const teacher = await requireTeacher();
    const { courseId } = await context.params;
    const file = await readEnrollmentExcelFile(request);
    const workbook = await parseEnrollmentWorkbookDetails(await file.arrayBuffer());
    const preview = await previewEnrollments(teacher.id, courseId, workbook.rows);
    return Response.json({ data: { ...preview, metadata: workbook.metadata } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
