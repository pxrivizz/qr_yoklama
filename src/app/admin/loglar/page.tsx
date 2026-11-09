import { redirect } from "next/navigation";

import { signOut } from "@/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { BugReportsView } from "@/components/teacher/bug-reports-view";
import { QrLogsView } from "@/components/teacher/qr-logs-view";
import { MaterialIcon } from "@/components/ui/icons";
import { getQrScanLogs } from "@/lib/attendance/qr-log-service";
import { requireAdmin } from "@/lib/auth/authorization";
import { listBugReports } from "@/lib/bug-reports/service";
import { prisma } from "@/lib/db";

export default async function AdminLogsPage() {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/giris");
  }

  const [courses, initialData, bugReportData] = await Promise.all([
    prisma.course.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { code: "asc" },
    }),
    getQrScanLogs({ page: 1, pageSize: 20 }),
    listBugReports({ page: 1, pageSize: 20 }),
  ]);

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/giris" });
  }

  return (
    <AdminShell email={admin.email} onSignOut={handleSignOut}>
      <PageContainer width="wide" className="space-y-8">
        <div className="border-b border-neutral-200/80 pb-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">
              <MaterialIcon name="security" className="text-sm text-neutral-500" />
              Güvenlik ve denetim
            </span>
          </div>
          <h1 className="mt-2 flex items-center gap-2.5 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            <MaterialIcon name="receipt_long" className="text-neutral-700" />
            Sistem Logları
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Kullanıcı bildirimlerini yönetin ve tüm QR okutma denetim kayıtlarını inceleyin.
          </p>
        </div>

        <BugReportsView
          initialReports={bugReportData.reports}
          initialTotal={bugReportData.pagination.total}
          initialSummary={bugReportData.summary}
        />

        <div className="border-t border-neutral-200 pt-8">
          <h2 className="text-lg font-bold text-neutral-900">QR okutma kayıtları</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Yoklama denemelerini, ağ ve konum kontrollerini ayrıntılı inceleyin.
          </p>
        </div>

        <QrLogsView
          initialLogs={initialData.logs}
          initialTotal={initialData.pagination.total}
          initialStats={initialData.stats}
          courses={courses}
        />
      </PageContainer>
    </AdminShell>
  );
}
