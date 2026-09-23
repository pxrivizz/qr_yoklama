import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { TeacherLayout } from "@/components/layout/teacher-layout";
import { ButtonLink } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/icons";
import { CourseCreateModal } from "@/components/teacher/course-create-modal";
import { AttendanceStartModal } from "@/components/teacher/attendance-start-modal";
import { getTeacherDashboardData } from "@/lib/dashboard/service";
import { prisma } from "@/lib/db";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatSessionDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function TeacherDashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");
  if (session.user.role !== "TEACHER") redirect("/ogrenci");

  const teacher = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, image: true },
  });

  if (!teacher || teacher.role !== "TEACHER") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-neutral-900">Öğretmen hesabı bulunamadı</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Giriş yaptığınız hesap henüz öğretmen rolüyle yetkilendirilmemiş. Sistem yöneticinizle iletişime geçin.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm font-medium text-neutral-900 underline">
            Ana sayfaya dön
          </Link>
        </div>
      </main>
    );
  }

  const { stats, recentSessions, coursesSummary } =
    await getTeacherDashboardData(teacher.id);

  const today = formatDate(new Date());

  return (
    <TeacherLayout
      userName={teacher.name ?? teacher.email}
      userImage={teacher.image}
      pageTitle="Genel Bakış"
    >
      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8">
        <div className="flex flex-col gap-4 border-b border-neutral-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-medium text-neutral-500">{today}</span>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              Genel Bakış
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              Derslerinizin katılım durumunu ve yoklama kayıtlarını buradan inceleyin.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ButtonLink
              href="/ogretmen/loglar"
              variant="secondary"
              className="border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50 shadow-none text-xs"
            >
              <MaterialIcon name="receipt_long" className="mr-1.5 text-base" />
              QR Logları
            </ButtonLink>
            <ButtonLink
              href="/ogretmen/dersler"
              variant="secondary"
              className="border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50 shadow-none text-xs"
            >
              Tüm Dersler
            </ButtonLink>
            <CourseCreateModal />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-neutral-200/80 bg-white p-5">
            <span className="text-xs font-medium text-neutral-500">Toplam Ders</span>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 tabular-nums">
              {stats.totalCourses}
            </p>
            <span className="mt-1 block text-xs text-neutral-400">Aktif ders</span>
          </div>

          <div className="rounded-xl border border-neutral-200/80 bg-white p-5">
            <span className="text-xs font-medium text-neutral-500">Kayıtlı Öğrenci</span>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 tabular-nums">
              {stats.totalEnrollments}
            </p>
            <span className="mt-1 block text-xs text-neutral-400">Toplam mevcud</span>
          </div>

          <div className="rounded-xl border border-neutral-200/80 bg-white p-5">
            <span className="text-xs font-medium text-neutral-500">Aktif Oturum</span>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 tabular-nums">
              {stats.activeSessions}
            </p>
            <span className="mt-1 block text-xs text-neutral-400">
              {stats.activeSessions > 0 ? "Devam eden yoklama" : "Açık oturum yok"}
            </span>
          </div>

          <div className="rounded-xl border border-neutral-200/80 bg-white p-5">
            <span className="text-xs font-medium text-neutral-500">Genel Katılım</span>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 tabular-nums">
              %{stats.overallAttendanceRate}
            </p>
            <span className="mt-1 block text-xs text-neutral-400">
              {stats.presentCount} katılım / {stats.absentCount} devamsızlık
            </span>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="flex items-center justify-between border-b border-neutral-200/80 pb-3">
              <h2 className="text-base font-semibold text-neutral-900">Dersler</h2>
              <Link
                href="/ogretmen/dersler"
                className="text-xs font-medium text-neutral-600 hover:text-neutral-900"
              >
                Tümünü Gör ({stats.totalCourses}) &rarr;
              </Link>
            </div>

            {coursesSummary.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center">
                <p className="text-sm text-neutral-600">Henüz ders kaydı bulunmuyor.</p>
                <div className="mt-4">
                  <CourseCreateModal />
                </div>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-neutral-200/60 rounded-xl border border-neutral-200/80 bg-white">
                {coursesSummary.map((c) => (
                  <div
                    key={c.id}
                    className={`p-5 transition-colors hover:bg-neutral-50/50 ${
                      c.hasActiveSession ? "bg-neutral-50/60" : ""
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded border border-neutral-200 bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-700">
                            {c.code}
                          </span>
                          {c.hasActiveSession && (
                            <span className="font-mono text-xs font-medium text-neutral-600">
                              Oturum Açık
                            </span>
                          )}
                        </div>
                        <h3 className="mt-1.5 truncate text-sm font-semibold text-neutral-900">
                          {c.name}
                        </h3>
                        <span className="text-xs text-neutral-500">
                          {c.hasActiveSession
                            ? "Yoklama oturumu devam ediyor"
                            : `${c.enrollmentCount} öğrenci kayıtlı`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {c.hasActiveSession ? (
                          <ButtonLink
                            href={`/ogretmen/ders/${c.id}/yoklama`}
                            size="sm"
                            variant="primary"
                            className="bg-neutral-900 text-white hover:bg-neutral-800 text-xs shadow-none"
                          >
                            Yoklamaya Dön
                          </ButtonLink>
                        ) : (
                          <AttendanceStartModal
                            courseId={c.id}
                            courseName={c.name}
                            totalWeeks={c.totalWeeks}
                            weeklySessionCount={c.weeklySessionCount}
                            completedSessionCount={c.completedSessions}
                          />
                        )}
                        <ButtonLink
                          href={`/ogretmen/ders/${c.id}/rapor`}
                          size="sm"
                          variant="secondary"
                          className="border border-neutral-200 text-xs shadow-none"
                        >
                          Rapor
                        </ButtonLink>
                        <Link
                          href={`/ogretmen/ders/${c.id}`}
                          className="rounded-lg border border-neutral-200 p-2 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                          title="Ders Ayarları"
                        >
                          <MaterialIcon name="tune" className="text-base" />
                        </Link>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-neutral-500">
                        <span>{c.completedSessions} / {c.plannedSessions} Oturum</span>
                        <span className="font-medium text-neutral-700 tabular-nums">%{c.progress}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className="h-full rounded-full bg-neutral-800 transition-all duration-300"
                          style={{ width: `${c.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6 lg:col-span-5">
            <div>
              <div className="border-b border-neutral-200/80 pb-3">
                <h2 className="text-base font-semibold text-neutral-900">Son Yoklamalar</h2>
              </div>

              {recentSessions.length === 0 ? (
                <div className="mt-4 rounded-xl border border-neutral-200/80 bg-white p-6 text-center text-xs text-neutral-500">
                  Henüz kaydedilmiş yoklama oturumu bulunmuyor.
                </div>
              ) : (
                <div className="mt-4 divide-y divide-neutral-200/60 rounded-xl border border-neutral-200/80 bg-white">
                  {recentSessions.map((sessionItem) => (
                    <div
                      key={sessionItem.id}
                      className="flex items-center justify-between p-4 transition-colors hover:bg-neutral-50/50"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-medium text-neutral-900">
                            {sessionItem.courseCode}
                          </span>
                          <span className="text-neutral-300">·</span>
                          <span className="text-xs text-neutral-500">
                            H{sessionItem.weekNumber} / O{sessionItem.sessionIndexInWeek}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-neutral-700">
                          {sessionItem.courseName}
                        </p>
                        <span className="text-[11px] text-neutral-400">
                          {formatSessionDate(sessionItem.startedAt)}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="block text-xs font-semibold tabular-nums text-neutral-900">
                          {sessionItem.presentCount} / {sessionItem.totalEnrollments}
                        </span>
                        <Link
                          href={`/ogretmen/ders/${sessionItem.courseId}/rapor`}
                          className="mt-0.5 text-xs text-neutral-500 hover:text-neutral-900 hover:underline"
                        >
                          Rapor
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {stats.alertStudentCount > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="flex items-start gap-2.5">
                  <MaterialIcon name="warning" className="text-amber-700 text-lg mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-amber-900">Devamsızlık Sınırı Uyarısı</span>
                    <p className="mt-0.5 text-xs text-amber-800">
                      Toplam <strong>{stats.alertStudentCount} öğrenci</strong> belirlenen devamsızlık sınırına ulaştı.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}
