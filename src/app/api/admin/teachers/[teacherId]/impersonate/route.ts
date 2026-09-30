import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/authorization";
import {
  createImpersonationToken,
  IMPERSONATION_COOKIE,
  impersonationCookieOptions,
} from "@/lib/auth/impersonation";
import { prisma } from "@/lib/db";
import { ApiError, apiErrorResponse } from "@/lib/http/api-error";
import { enforceRateLimit } from "@/lib/http/rate-limit";
import { getRequestContext } from "@/lib/http/request-context";

type RouteContext = { params: Promise<{ teacherId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    const { teacherId } = await context.params;
    enforceRateLimit(`admin-impersonate:${admin.id}`, { limit: 20, windowMs: 60_000 });
    const teacher = await prisma.user.findFirst({
      where: { id: teacherId, role: "TEACHER" },
      select: { id: true, name: true, email: true },
    });
    if (!teacher) throw new ApiError(404, "TEACHER_NOT_FOUND", "Öğretmen bulunamadı.");

    const token = await createImpersonationToken(admin.id, teacher.id);
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "TEACHER_IMPERSONATION_STARTED",
        entityType: "User",
        entityId: teacher.id,
        after: { name: teacher.name, email: teacher.email },
        ...getRequestContext(request),
      },
    });

    const response = NextResponse.json({ data: { redirectTo: "/ogretmen" } });
    response.cookies.set(IMPERSONATION_COOKIE, token, impersonationCookieOptions);
    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}
