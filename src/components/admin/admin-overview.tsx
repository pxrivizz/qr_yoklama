import { MaterialIcon } from "@/components/ui/icons";

type Activity = {
  id: string;
  action: string;
  entityType: string;
  createdAt: Date | string;
  actor: { name: string | null; email: string } | null;
};

type Report = {
  id: string;
  subject: string;
  status: "PENDING" | "IN_PROGRESS" | "FIXED";
  createdAt: Date | string;
  reporter: { name: string | null; email: string };
};

type AdminOverviewProps = {
  stats: {
    teacherCount: number;
    studentCount: number;
    courseCount: number;
    enrollmentCount: number;
    linkedEnrollmentCount: number;
    activeSessionCount: number;
    recentAttendanceCount: number;
  };
  unresolvedReportCount: number;
  recentActivity: Activity[];
  recentReports: Report[];
};

const actionLabels: Record<string, string> = {
  ADMIN_CREATED: "Yönetici hesabı oluşturuldu",
  TEACHER_CREATED: "Öğretmen hesabı oluşturuldu",
  TEACHER_DELETED: "Öğretmen hesabı silindi",
  TEACHER_PASSWORD_RESET: "Öğretmen şifresi yenilendi",
  ADMIN_IMPERSONATION_STARTED: "Öğretmen hesabına geçildi",
  TEACHER_IMPERSONATION_STARTED: "Öğretmen hesabına geçildi",
  ADMIN_IMPERSONATION_ENDED: "Hesap görüntüleme sonlandırıldı",
  COURSE_CREATED: "Yeni ders oluşturuldu",
  ENROLLMENTS_IMPORTED: "Öğrenci listesi içe aktarıldı",
  MANUAL_ATTENDANCE_UPDATED: "Manuel yoklama güncellendi",
  SESSION_STARTED: "Yoklama oturumu başlatıldı",
  STUDENT_ENROLLMENTS_MATCHED: "Öğrenci hesapları eşleştirildi",
};

const reportStatus = {
  PENDING: { label: "Bekliyor", className: "bg-amber-50 text-amber-800" },
  IN_PROGRESS: { label: "İşlemde", className: "bg-blue-50 text-blue-700" },
  FIXED: { label: "Çözüldü", className: "bg-emerald-50 text-emerald-700" },
};

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function AdminOverview({ stats, unresolvedReportCount, recentActivity, recentReports }: AdminOverviewProps) {
  const linkedRate = stats.enrollmentCount ? Math.round((stats.linkedEnrollmentCount / stats.enrollmentCount) * 100) : 0;
  const metrics = [
    { label: "Öğretmen", value: stats.teacherCount, icon: "group" },
    { label: "Öğrenci hesabı", value: stats.studentCount, icon: "school" },
    { label: "Ders", value: stats.courseCount, icon: "menu_book" },
    { label: "Ders kaydı", value: stats.enrollmentCount, icon: "assignment" },
  ];

  return (
    <section id="genel-bakis" aria-labelledby="overview-heading" className="scroll-mt-24">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <h2 id="overview-heading" className="text-2xl font-bold tracking-[-0.025em] text-neutral-950 sm:text-[32px]">Yönetim merkezi</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">Sistem hareketlerini izleyin, destek taleplerini yönetin ve öğretmen erişimlerini tek yerden kontrol edin.</p>
        </div>
        <a href="#ogretmenler" className="inline-flex min-h-10 w-fit items-center gap-2 rounded-lg bg-[#075c50] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#064b42]">
          <MaterialIcon name="person_add" className="text-lg" /> Öğretmen ekle
        </a>
      </div>

      <dl className="mt-7 grid grid-cols-2 overflow-hidden rounded-xl border border-neutral-200 bg-white xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex items-center gap-3 border-b border-r border-neutral-200 px-4 py-4 even:border-r-0 [&:nth-child(n+3)]:border-b-0 xl:border-b-0 xl:border-r xl:px-5 xl:py-5 xl:even:border-r xl:last:border-r-0">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-600 sm:size-10"><MaterialIcon name={metric.icon} className="text-lg sm:text-xl" /></span>
            <div><dt className="text-xs font-medium text-neutral-500">{metric.label}</dt><dd className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-neutral-950">{metric.value}</dd></div>
          </div>
        ))}
      </dl>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white" aria-labelledby="work-heading">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
            <div><h3 id="work-heading" className="text-base font-semibold text-neutral-950">Bekleyen işler</h3><p className="mt-0.5 text-xs text-neutral-500">Öncelikli destek kayıtları ve müdahale durumu</p></div>
            <a href="#destek" className="text-xs font-semibold text-[#075c50] hover:underline hover:underline-offset-4">Tümünü gör</a>
          </div>

          <div className="m-5 flex items-center gap-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-4">
            <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${unresolvedReportCount ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
              <MaterialIcon name={unresolvedReportCount ? "support_agent" : "task_alt"} className="text-xl" />
            </span>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-neutral-950">{unresolvedReportCount ? `${unresolvedReportCount} açık destek kaydı` : "Açık destek kaydı yok"}</p><p className="mt-0.5 text-xs text-neutral-500">{unresolvedReportCount ? "Yanıt bekleyen kayıtları inceleyin." : "Tüm destek talepleri yanıtlandı."}</p></div>
            <a href="#destek" className="grid size-9 shrink-0 place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:text-neutral-950" aria-label="Destek kayıtlarına git"><MaterialIcon name="arrow_forward" className="text-lg" /></a>
          </div>

          <div className="border-t border-neutral-100">
            {recentReports.length === 0 ? <p className="px-5 py-8 text-center text-sm text-neutral-500">Henüz destek kaydı bulunmuyor.</p> : (
              <ul className="divide-y divide-neutral-100">
                {recentReports.map((report) => {
                  const status = reportStatus[report.status];
                  return <li key={report.id} className="grid gap-2 px-5 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4">
                    <div className="min-w-0"><p className="truncate text-sm font-medium text-neutral-900">{report.subject}</p><p className="mt-0.5 truncate text-xs text-neutral-500">{report.reporter.name?.trim() || report.reporter.email}</p></div>
                    <span className={`w-fit rounded-md px-2 py-1 text-[11px] font-medium ${status.className}`}>{status.label}</span>
                    <time className="text-xs tabular-nums text-neutral-400" dateTime={new Date(report.createdAt).toISOString()}>{formatDate(report.createdAt)}</time>
                  </li>;
                })}
              </ul>
            )}
          </div>
        </section>

        <div className="space-y-5">
          <section className="rounded-xl border border-neutral-200 bg-white" aria-labelledby="pulse-heading">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <h3 id="pulse-heading" className="text-base font-semibold text-neutral-950">Sistem Durumu</h3>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500">
                <span className="size-2 rounded-full bg-[#075c50]" /> Anlık özet
              </span>
            </div>
            <dl className="grid grid-cols-3 divide-x divide-neutral-200 px-2 py-5">
              <div className="px-3"><dt className="text-[11px] leading-4 text-neutral-500">Aktif oturum</dt><dd className="mt-2 text-2xl font-semibold tabular-nums text-neutral-950">{stats.activeSessionCount}</dd></div>
              <div className="px-3"><dt className="text-[11px] leading-4 text-neutral-500">Son 24 saat</dt><dd className="mt-2 text-2xl font-semibold tabular-nums text-neutral-950">{stats.recentAttendanceCount}</dd></div>
              <div className="px-3"><dt className="text-[11px] leading-4 text-neutral-500">Eşleşme</dt><dd className="mt-2 text-2xl font-semibold tabular-nums text-neutral-950">%{linkedRate}</dd></div>
            </dl>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white" aria-labelledby="activity-heading">
            <div className="border-b border-neutral-200 px-5 py-4"><h3 id="activity-heading" className="text-base font-semibold text-neutral-950">Son etkinlikler</h3></div>
            {recentActivity.length === 0 ? <p className="px-5 py-8 text-center text-sm text-neutral-500">Henüz yönetim hareketi kaydedilmedi.</p> : (
              <ol className="divide-y divide-neutral-100">
                {recentActivity.slice(0, 5).map((activity) => <li key={activity.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><MaterialIcon name="history" className="text-base" /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-neutral-900">{actionLabels[activity.action] ?? activity.action.replaceAll("_", " ")}</p><p className="mt-0.5 truncate text-[11px] text-neutral-500">{activity.actor?.name?.trim() || activity.actor?.email || "Sistem"}</p></div>
                  <time className="shrink-0 text-[11px] tabular-nums text-neutral-400" dateTime={new Date(activity.createdAt).toISOString()}>{formatDate(activity.createdAt)}</time>
                </li>)}
              </ol>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
