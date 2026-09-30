import "server-only";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http/api-error";
import { getActiveImpersonation } from "@/lib/auth/impersonation";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, "UNAUTHENTICATED", "Oturum açmanız gerekiyor.");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, schoolNumber: true, image: true },
  });

  if (!user) {
    throw new ApiError(401, "USER_NOT_FOUND", "Kullanıcı hesabı bulunamadı.");
  }

  return user;
}

export async function requireTeacher() {
  const user = await requireUser();

  if (user.role === "TEACHER") return user;

  if (user.role === "ADMIN") {
    const impersonation = await getActiveImpersonation(user.id);
    if (impersonation) {
      const teacher = await prisma.user.findFirst({
        where: { id: impersonation.teacherId, role: "TEACHER" },
        select: { id: true, name: true, email: true, role: true, schoolNumber: true, image: true },
      });
      if (teacher) return teacher;
    }
  }

  throw new ApiError(
    403,
    "TEACHER_REQUIRED",
    user.role === "ADMIN"
      ? "Önce admin panelinden bir öğretmen hesabına geçin."
      : "Bu işlem yalnızca öğretmenler tarafından yapılabilir.",
  );
}

export async function requireActualTeacher() {
  const user = await requireUser();
  if (user.role !== "TEACHER") {
    throw new ApiError(
      403,
      "TEACHER_REQUIRED",
      "Bu işlem yalnızca öğretmenler tarafından yapılabilir.",
    );
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new ApiError(403, "ADMIN_REQUIRED", "Bu işlem yalnızca yöneticiler tarafından yapılabilir.");
  }
  return user;
}

export async function requireSupportStaff() {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "TEACHER") {
    throw new ApiError(
      403,
      "SUPPORT_STAFF_REQUIRED",
      "Hata bildirimlerini yalnızca yönetici veya öğretmenler yönetebilir.",
    );
  }
  return user;
}

export async function requireStudent() {
  const user = await requireUser();
  if (user.role !== "STUDENT") {
    throw new ApiError(
      403,
      "STUDENT_REQUIRED",
      "Bu QR yalnızca öğrenci hesabıyla okutulabilir. Öğretmen hesabından çıkış yapıp öğrenci hesabınızla giriş yapın.",
    );
  }

  return user;
}
