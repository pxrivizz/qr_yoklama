import Link from "next/link";

import { TeacherLayout } from "@/components/layout/teacher-layout";
import { PageContainer } from "@/components/layout/page-container";
import { ButtonLink } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/icons";
import { CourseCreateModal } from "@/components/teacher/course-create-modal";
import { AttendanceStartModal } from "@/components/teacher/attendance-start-modal";
import { getTeacherDashboardData } from "@/lib/dashboard/service";
import { requireTeacher } from "@/lib/auth/authorization";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default async function TeacherDashboard() {
  const teacher = await requireTeacher();

  const { stats, coursesSummary } =
    await getTeacherDashboardData(teacher.id);

  const today = formatDate(new Date());

  return (
    <TeacherLayout
      userName={teacher.name ?? teacher.email}
      userImage={teacher.image}
      pageTitle="Genel bakış"
    >
      <PageContainer>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs font-medium text-on-surface-variant">{today}</span>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
              Genel bakış
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Derslerinizi ve yoklamaları yönetin.
            </p>
          </div>

          <div className="flex w-full items-center gap-2.5 sm:w-auto">
            <ButtonLink
              href="/ogretmen/dersler"
              variant="secondary"
              className="min-h-11 flex-1 px-4 text-xs sm:flex-none"
            >
              Tüm dersler
            </ButtonLink>
            <CourseCreateModal />
          </div>
        </div>

        {/*
          Öğretmen özet widget'ları geçici olarak devre dışı bırakıldı.
          Yeniden etkinleştirmek için bu JSX yorumunu kaldırın.
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
            <span className="mt-1 block text-xs text-neutral-400">Toplam mevcut</span>
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
        */}

        <div className="mt-8 space-y-6">
          {stats.alertStudentCount > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
              <div className="flex items-start gap-2.5">
                <MaterialIcon name="warning" className="mt-0.5 text-lg text-amber-700" />
                <div>
                  <span className="text-xs font-semibold text-amber-900">Devamsızlık sınırı uyarısı</span>
                  <p className="mt-0.5 text-xs text-amber-800">
                    Toplam <strong>{stats.alertStudentCount} öğrenci</strong> belirlenen devamsızlık sınırına ulaştı.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h2 className="text-base font-semibold text-on-surface">Dersler</h2>
              <Link
                href="/ogretmen/dersler"
                className="rounded-sm text-xs font-medium text-on-surface-variant underline-offset-4 hover:text-on-surface hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Tümünü gör ({stats.totalCourses}) &rarr;
              </Link>
            </div>

            {coursesSummary.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-outline bg-surface-container-lowest p-8 text-center">
                <p className="text-sm text-on-surface-variant">Henüz ders kaydı bulunmuyor.</p>
                <div className="mt-4">
                  <CourseCreateModal />
                </div>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-outline-variant overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
                {coursesSummary.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 transition-colors hover:bg-surface-container-low sm:p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded border border-outline-variant bg-surface-container px-2 py-0.5 font-mono text-xs text-on-surface-variant">
                            {c.code}
                          </span>
                          {c.hasActiveSession && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary">
                              <span className="size-1.5 rounded-full bg-secondary" aria-hidden="true" />
                              Oturum açık
                            </span>
                          )}
                        </div>
                        <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold text-on-surface sm:truncate">
                          {c.name}
                        </h3>
                        <span className="mt-0.5 block text-xs text-on-surface-variant">
                          {c.hasActiveSession
                            ? "Yoklama oturumu devam ediyor"
                            : `${c.enrollmentCount} öğrenci kayıtlı`}
                        </span>
                      </div>

                      <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 sm:flex sm:w-auto">
                        {c.hasActiveSession ? (
                          <ButtonLink
                            href={`/ogretmen/ders/${c.id}/yoklama`}
                            size="sm"
                            variant="primary"
                            className="min-h-10 px-3.5 text-xs"
                          >
                            Yoklamaya dön
                          </ButtonLink>
                        ) : (
                          <AttendanceStartModal
                            courseId={c.id}
                            courseName={c.name}
                            attendanceMode={c.attendanceMode}
                            preparatoryDayPlans={c.preparatoryDayPlans}
                            totalWeeks={c.totalWeeks}
                            weeklySessionCount={c.weeklySessionCount}
                            completedSessions={c.completedSessionSlots}
                          />
                        )}
                        <ButtonLink
                          href={`/ogretmen/ders/${c.id}/rapor`}
                          size="sm"
                          variant="secondary"
                          className="min-h-10 px-3.5 text-xs"
                        >
                          Rapor
                        </ButtonLink>
                        <ButtonLink
                          href={`/ogretmen/ders/${c.id}`}
                          size="sm"
                          variant="secondary"
                          className="min-h-10 px-3.5 text-xs"
                        >
                          Ayarlar
                        </ButtonLink>
                      </div>
                    </div>

                    <div className="mt-3.5">
                      <div className="flex items-center justify-between text-xs text-on-surface-variant">
                        <span>{c.completedSessions} / {c.plannedSessions} oturum</span>
                        <span className="font-medium text-on-surface tabular-nums">%{c.progress}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-container">
                        <div
                          className="h-full rounded-full bg-primary transition-[width] duration-300"
                          style={{ width: `${c.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PageContainer>
    </TeacherLayout>
  );
}
