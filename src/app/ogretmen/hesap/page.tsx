import { redirect } from "next/navigation";

import { TeacherLayout } from "@/components/layout/teacher-layout";
import { PageContainer } from "@/components/layout/page-container";
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
      <PageContainer width="compact">
        <div className="mb-5">
          <h1 className="font-h1 text-h1 text-on-surface">Hesap güvenliği</h1>
          <p className="mt-2 text-on-surface-variant">Giriş şifrenizi doğrulayarak güvenle değiştirebilirsiniz.</p>
        </div>
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 sm:p-5">
          <h2 className="font-h3 text-h3 text-on-surface">Şifre değiştir</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Değişiklik denetim kaydına işlenir ve diğer açık oturumlar kapatılır.</p>
          <div className="mt-5">
            <PasswordChangeForm />
          </div>
        </section>
      </PageContainer>
    </TeacherLayout>
  );
}
