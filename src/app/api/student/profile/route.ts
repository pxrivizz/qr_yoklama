import { requireStudent } from "@/lib/auth/authorization";
import { apiErrorResponse } from "@/lib/http/api-error";
import { getRequestContext } from "@/lib/http/request-context";
import { studentProfileSchema } from "@/lib/students/profile-schema";
import { matchStudentEnrollments, updateStudentPhoto } from "@/lib/students/service";
import { readJsonBody } from "@/lib/http/request-body";
import { enforceRateLimit } from "@/lib/http/rate-limit";

export async function PATCH(request: Request) {
  try {
    const student = await requireStudent();
    enforceRateLimit(`student-profile:${student.id}`, { limit: 10, windowMs: 60_000 });
    const input = studentProfileSchema.parse(await readJsonBody(request, 3 * 1024 * 1024));
    const context = getRequestContext(request);

    let matchResult = null;
    if (input.schoolNumber) {
      matchResult = await matchStudentEnrollments(student.id, input.schoolNumber, context);
    }

    if (input.image) {
      await updateStudentPhoto(student.id, input.image, context);
    }

    return Response.json({
      data: {
        ...(matchResult ?? {}),
        photoUpdated: Boolean(input.image),
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
