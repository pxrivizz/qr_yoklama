import { requireStudent } from "@/lib/auth/authorization";
import { apiErrorResponse } from "@/lib/http/api-error";
import { getStudentActiveSessions } from "@/lib/attendance/session-service";

export async function GET() {
  try {
    const student = await requireStudent();
    const data = await getStudentActiveSessions(student.id);
    return Response.json({ data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
