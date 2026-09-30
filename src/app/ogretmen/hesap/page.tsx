import { redirect } from "next/navigation";

import { TeacherLayout } from "@/components/layout/teacher-layout";
import { PasswordChangeForm } from "@/components/teacher/password-change-form";
import { requireActualTeacher } from "@/lib/auth/authorization";

export default async function TeacherAccountPage() {
  let teacher;
  try {
    teacher = await requireActualTeacher();
  } catch {
    redirect("/ogretmen");
  }

  return (
    <TeacherLayout userName={teacher.name ?? teacher.email} pageTitle="Hesap Ayarları">
      <div className="mx-auto max-w-3xl px-6 py-8 sm:px-margin-page sm:py-10">
        <div className="mb-6">
          <h1 className="font-h1 text-h1 text-on-surface">Hesap güvenliği</h1>
          <p className="mt-2 text-on-surface-variant">Giriş şifrenizi doğrulayarak güvenle değiştirebilirsiniz.</p>
        </div>
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6">
          <h2 className="font-h3 text-h3 text-on-surface">Şifre değiştir</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Değişiklik denetim kaydına işlenir ve diğer açık oturumlar kapatılır.</p>
          <div className="mt-6">
            <PasswordChangeForm />
          </div>
        </section>
      </div>
    </TeacherLayout>
  );
}
