import { requireTeacher } from "@/lib/auth/authorization";
import { parseEnrollmentWorkbookDetails } from "@/lib/enrollments/excel-parser";
import { readEnrollmentExcelFile } from "@/lib/enrollments/upload";
import { apiErrorResponse } from "@/lib/http/api-error";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireTeacher();
    const file = await readEnrollmentExcelFile(request);
    const workbook = await parseEnrollmentWorkbookDetails(await file.arrayBuffer());
    const validRows = workbook.rows.filter((row) => row.errors.length === 0);
    const invalid = workbook.rows.length - validRows.length;
    const mandatoryCount = validRows.filter((row) => row.isMandatory).length;
    const optionalCount = validRows.length - mandatoryCount;

    return Response.json({
      data: {
        rows: workbook.rows,
        metadata: workbook.metadata,
        summary: {
          total: workbook.rows.length,
          valid: validRows.length,
          invalid,
          mandatoryCount,
          optionalCount,
        },
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
