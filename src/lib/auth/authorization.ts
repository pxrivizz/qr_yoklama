import "server-only";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http/api-error";

export async function requireTeacher() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, "UNAUTHENTICATED", "Oturum açmanız gerekiyor.");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    throw new ApiError(401, "USER_NOT_FOUND", "Kullanıcı hesabı bulunamadı.");
  }

  if (user.role !== "TEACHER") {
    throw new ApiError(
      403,
      "TEACHER_REQUIRED",
      "Bu işlem yalnızca öğretmenler tarafından yapılabilir.",
    );
  }

  return user;
}

export async function requireStudent() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(
      401,
      "STUDENT_SIGN_IN_REQUIRED",
      "Yoklamayı kaydetmek için öğrenci hesabınızla giriş yapın.",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, schoolNumber: true },
  });
  if (!user) {
    throw new ApiError(401, "USER_NOT_FOUND", "Kullanıcı hesabı bulunamadı.");
  }
  if (user.role !== "STUDENT") {
    throw new ApiError(
      403,
      "STUDENT_REQUIRED",
      "Bu QR yalnızca öğrenci hesabıyla okutulabilir. Öğretmen hesabından çıkış yapıp öğrenci hesabınızla giriş yapın.",
    );
  }

  return user;
}
