import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/authorization";
import {
  getActiveImpersonation,
  IMPERSONATION_COOKIE,
} from "@/lib/auth/impersonation";
import { prisma } from "@/lib/db";
import { apiErrorResponse } from "@/lib/http/api-error";
import { getRequestContext } from "@/lib/http/request-context";

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin();
    const impersonation = await getActiveImpersonation(admin.id);
    if (impersonation) {
      await prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "TEACHER_IMPERSONATION_ENDED",
          entityType: "User",
          entityId: impersonation.teacherId,
          ...getRequestContext(request),
        },
      });
    }
    const response = NextResponse.json({ data: { stopped: true, redirectTo: "/admin" } });
    response.cookies.set(IMPERSONATION_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}
