import { redirect } from "next/navigation";

import { signOut } from "@/auth";
import { AdminAccountManager } from "@/components/admin/admin-account-manager";
import { AdminOverview } from "@/components/admin/admin-overview";
import { AdminShell } from "@/components/admin/admin-shell";
import { TeacherManager } from "@/components/admin/teacher-manager";
import { BugReportsView } from "@/components/teacher/bug-reports-view";
import { getAdminDashboardOverview, listAdmins, listTeachers } from "@/lib/admin/service";
import { requireAdmin } from "@/lib/auth/authorization";
import { listBugReports } from "@/lib/bug-reports/service";

export default async function AdminPage() {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/giris");
  }
  const [teachers, admins, bugReportData, overview] = await Promise.all([
    listTeachers(),
    listAdmins(),
    listBugReports({ page: 1, pageSize: 20 }),
    getAdminDashboardOverview(),
  ]);

  const unresolvedReportCount =
    bugReportData.summary.PENDING + bugReportData.summary.IN_PROGRESS;

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/giris" });
  }

  return (
    <AdminShell email={admin.email} onSignOut={handleSignOut}>
      <div className="mx-auto max-w-[1320px] space-y-12 px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        <AdminOverview
          stats={overview}
          unresolvedReportCount={unresolvedReportCount}
          recentActivity={overview.recentActivity}
          recentReports={bugReportData.reports.slice(0, 4)}
        />

        <section id="destek" className="scroll-mt-24 border-t border-neutral-200 pt-10">
          <BugReportsView
            initialReports={bugReportData.reports}
            initialTotal={bugReportData.pagination.total}
            initialSummary={bugReportData.summary}
          />
        </section>

        <section id="ogretmenler" className="scroll-mt-24 border-t border-neutral-200 pt-10">
          <div className="mb-7 max-w-2xl">
            <h2 className="font-h1 text-h1 text-on-surface">Öğretmen yönetimi</h2>
            <p className="mt-2 text-on-surface-variant">Öğretmen hesaplarını oluşturun, erişimlerini yenileyin veya destek için hesaplarını görüntüleyin.</p>
          </div>
          <TeacherManager initialTeachers={teachers} />
        </section>

        <section id="yoneticiler" className="scroll-mt-24 border-t border-neutral-200 pt-10">
          <div className="mb-7 max-w-2xl">
            <h2 className="font-h1 text-h1 text-on-surface">Yönetici erişimi</h2>
            <p className="mt-2 text-on-surface-variant">Yeni yönetici hesabı oluşturun ve tam yetkili hesapları tek noktadan takip edin.</p>
          </div>
          <AdminAccountManager currentAdminId={admin.id} initialAdmins={admins} />
        </section>
      </div>
    </AdminShell>
  );
}
