import { requireTeacher } from "@/lib/auth/authorization";
import { getCourseStudents } from "@/lib/enrollments/service";
import { writeEnrollmentsWorkbook } from "@/lib/enrollments/student-export";
import { apiErrorResponse } from "@/lib/http/api-error";

type RouteContext = { params: Promise<{ courseId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const teacher = await requireTeacher();
    const { courseId } = await context.params;
    const data = await getCourseStudents(teacher.id, courseId);
    const workbook = writeEnrollmentsWorkbook(data);

    const dersAdi = data.course.name
      .replace(/ı/g, "i")
      .replace(/İ/g, "I")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9_-]+/gi, "-");

    const filename = `${dersAdi}-ogrenci-listesi-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new Response(new Uint8Array(workbook), {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
