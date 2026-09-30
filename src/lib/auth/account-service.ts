import "server-only";

import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { ApiError } from "@/lib/http/api-error";
import type { RequestContext } from "@/lib/http/request-context";
import type { ChangePasswordInput } from "@/lib/auth/account-schema";

export async function changeTeacherPassword(
  teacherId: string,
  input: ChangePasswordInput,
  context: RequestContext,
) {
  const teacher = await prisma.user.findFirst({
    where: { id: teacherId, role: "TEACHER" },
    select: { id: true, passwordHash: true },
  });
  if (!teacher?.passwordHash) {
    throw new ApiError(
      409,
      "PASSWORD_NOT_INITIALIZED",
      "Hesabınız için henüz bir parola oluşturulmamış. Yöneticinizden geçici parola isteyin.",
    );
  }
  if (!(await verifyPassword(input.currentPassword, teacher.passwordHash))) {
    throw new ApiError(422, "CURRENT_PASSWORD_INVALID", "Mevcut şifreniz yanlış.");
  }

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: teacherId },
      data: { passwordHash, passwordChangedAt: new Date(), authVersion: { increment: 1 } },
    });
    await tx.session.deleteMany({ where: { userId: teacherId } });
    await tx.auditLog.create({
      data: {
        actorId: teacherId,
        action: "TEACHER_PASSWORD_CHANGED",
        entityType: "User",
        entityId: teacherId,
        ...context,
      },
    });
  });
}
