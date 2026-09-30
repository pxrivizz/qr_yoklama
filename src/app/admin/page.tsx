import { redirect } from "next/navigation";

import { signOut } from "@/auth";
import { TeacherManager } from "@/components/admin/teacher-manager";
import { BugReportsView } from "@/components/teacher/bug-reports-view";
import { MaterialIcon } from "@/components/ui/icons";
import { listTeachers } from "@/lib/admin/service";
import { requireAdmin } from "@/lib/auth/authorization";
import { listBugReports } from "@/lib/bug-reports/service";

export default async function AdminPage() {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/giris");
  }
  const [teachers, bugReportData] = await Promise.all([
    listTeachers(),
    listBugReports({ page: 1, pageSize: 20 }),
  ]);

  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b border-outline-variant bg-surface-container-lowest">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-neutral-900 text-white">
              <MaterialIcon name="admin_panel_settings" />
            </span>
            <div className="min-w-0">
              <h1 className="font-semibold text-on-surface">Yönetim Paneli</h1>
              <p className="truncate text-xs text-on-surface-variant">{admin.email}</p>
            </div>
          </div>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/giris" }); }}>
            <button type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-outline-variant bg-white px-3 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container">
              <MaterialIcon name="logout" className="text-base" /> Çıkış
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-7xl space-y-10 px-5 py-8 sm:px-8 sm:py-10">
        <section>
          <BugReportsView
            initialReports={bugReportData.reports}
            initialTotal={bugReportData.pagination.total}
            initialSummary={bugReportData.summary}
          />
        </section>

        <section className="border-t border-outline-variant pt-8">
          <div className="mb-7 max-w-2xl">
            <h2 className="font-h1 text-h1 text-on-surface">Öğretmen yönetimi</h2>
            <p className="mt-2 text-on-surface-variant">Öğretmen hesaplarını oluşturun, erişimlerini yenileyin veya destek için hesaplarını görüntüleyin.</p>
          </div>
          <TeacherManager initialTeachers={teachers} />
        </section>
      </div>
    </main>
  );
}
