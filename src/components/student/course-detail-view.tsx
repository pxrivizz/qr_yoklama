"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { MaterialIcon } from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableRow, Th, Td } from "@/components/ui/table";
import { StudentQrModal } from "./student-qr-modal";
import { cn } from "@/lib/cn";
import type { StudentCourseAttendanceDetail } from "@/lib/students/attendance-service";
import { AbsenceLimitMeter } from "./absence-limit-meter";
import { formatPreparatorySlot } from "@/lib/attendance/slot";

type CourseDetailViewProps = {
  initialData: StudentCourseAttendanceDetail;
};

function formatDateTime(dateVal: string | Date) {
  const d = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function attendanceSlotLabel(slot: {
  slotType: "WEEKLY" | "CALENDAR_PERIOD";
  weekNumber: number | null;
  sessionIndexInWeek: number | null;
  sessionDate: string | Date | null;
  lessonPeriod: number | null;
}) {
  if (slot.slotType === "CALENDAR_PERIOD" && slot.sessionDate && slot.lessonPeriod) {
    return formatPreparatorySlot(slot.sessionDate, slot.lessonPeriod);
  }
  return `Hafta ${slot.weekNumber}, ${slot.sessionIndexInWeek}. oturum`;
}

export function CourseDetailView({ initialData }: CourseDetailViewProps) {
  const [data, setData] = useState<StudentCourseAttendanceDetail>(initialData);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isRefreshing, startTransition] = useTransition();

  const course = data.course;
  const summary = data.summary;
  const activeSession = data.activeSession;

  const refetchData = useCallback(async (signal?: AbortSignal) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/student/courses/${course.id}`, { signal });
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setData(json.data);
          }
        }
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          console.error("Ders verisi yenilenemedi:", err);
        }
      }
    });
  }, [course.id]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setInterval(() => {
      void refetchData(controller.signal);
    }, 12000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [refetchData]);

  function handleQrScanSuccess() {
    void refetchData();
  }

  return (
    <div className="animate-fade-in-up space-y-6 sm:space-y-8">
      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest px-5 py-5 shadow-[0_8px_24px_rgba(25,28,30,0.06)] sm:px-6 sm:py-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <Link
              href="/ogrenci"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface"
            >
              <MaterialIcon name="arrow_back" className="text-lg" /> Öğrenci paneline dön
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
              <span className="font-semibold text-primary">{course.code}</span>
              {data.enrollment.isMandatory && (
                <><span aria-hidden="true">·</span><span>Zorunlu ders</span></>
              )}
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
              {course.name}
            </h1>
            <p className="mt-2 text-sm leading-5 text-on-surface-variant">
              Öğretim Üyesi: <span className="font-medium text-on-surface">{course.teacher.name ?? course.teacher.email}</span>
              {" · "}Öğrenci No: <span className="font-mono text-on-surface">{data.enrollment.schoolNumberOnList}</span>
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void refetchData()}
            disabled={isRefreshing}
            className="min-h-11 shrink-0 gap-1.5 shadow-none"
          >
            <MaterialIcon
              name="sync"
              className={cn("text-base", isRefreshing && "animate-spin")}
            />
            Yenile
          </Button>
        </div>
      </section>

      {summary.hasLimit && (
        <AbsenceLimitMeter
          absenceCount={summary.totalAbsenceCount}
          limit={summary.limit!}
          level={summary.limitLevel === "none" ? "safe" : summary.limitLevel}
          isFailed={summary.isFailed}
        />
      )}

      <section aria-labelledby="attendance-summary-heading">
        <h2 id="attendance-summary-heading" className="mb-3 text-base font-semibold text-on-surface">
          Devamsızlık özeti
        </h2>
        <dl className="grid grid-cols-2 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0_8px_24px_rgba(25,28,30,0.05)] sm:grid-cols-4">
          <div className="border-b border-outline-variant px-4 py-5 sm:border-b-0 sm:px-5">
            <dt className="text-xs font-medium text-on-surface-variant">Toplam devamsızlık</dt>
            <dd className={cn(
              "mt-2 text-2xl font-bold tracking-tight tabular-nums",
              summary.isFailed ? "text-error" : "text-on-surface",
            )}>
              {summary.totalAbsenceCount}
            </dd>
            <dd className="mt-0.5 text-xs text-on-surface-variant">
              {summary.hasLimit ? `Sınır: ${summary.limit} oturum` : "Sınır belirtilmedi"}
            </dd>
          </div>

          <div className="border-b border-l border-outline-variant px-4 py-5 sm:border-b-0 sm:px-5">
            <dt className="text-xs font-medium text-on-surface-variant">Katıldığı oturum</dt>
            <dd className="mt-2 text-2xl font-bold tracking-tight text-emerald-700 tabular-nums">
              {summary.attendedCount} <span className="text-sm font-normal text-on-surface-variant">/ {summary.totalSessions}</span>
            </dd>
            <dd className="mt-0.5 text-xs text-on-surface-variant">Tamamlanan oturumlar</dd>
          </div>

          <div className="px-4 py-5 sm:border-l sm:border-outline-variant sm:px-5">
            <dt className="text-xs font-medium text-on-surface-variant">Kalan hak</dt>
            <dd className={cn(
              "mt-2 text-2xl font-bold tracking-tight tabular-nums",
              summary.remainingAllowance !== null && summary.remainingAllowance <= 0
                ? "text-error"
                : summary.remainingAllowance === 1
                ? "text-amber-600"
                : "text-on-surface",
            )}>
              {summary.hasLimit && summary.remainingAllowance !== null
                ? `${summary.remainingAllowance} oturum`
                : "Belirtilmedi"}
            </dd>
            <dd className="mt-0.5 text-xs text-on-surface-variant">
              {summary.hasLimit ? (summary.isFailed ? "Hak bitti — kaldınız" : "Kalan hak") : "Öğretmen sınır belirlemedi"}
            </dd>
          </div>

          <div className="border-l border-outline-variant px-4 py-5 sm:px-5">
            <dt className="text-xs font-medium text-on-surface-variant">Katılım oranı</dt>
            <dd className="mt-2 text-2xl font-bold tracking-tight text-on-surface tabular-nums">
              %{summary.attendanceRate}
            </dd>
            <dd className="mt-0.5 text-xs text-on-surface-variant">
              Devamsızlık Oranı: %{summary.absencePercentage}
            </dd>
          </div>
        </dl>
      </section>

      <section
        aria-labelledby="qr-attendance-heading"
        className={cn(
          "overflow-hidden rounded-xl border bg-surface-container-lowest shadow-[0_8px_24px_rgba(25,28,30,0.05)]",
          activeSession ? "border-emerald-200" : "border-outline-variant",
        )}
      >
        <div className="border-b border-outline-variant px-5 py-4 sm:px-6">
          <h2 id="qr-attendance-heading" className="text-base font-semibold text-on-surface">
            QR ile yoklama
          </h2>
        </div>

        {activeSession ? (
          activeSession.alreadyAttended ? (
            <div className="flex flex-col gap-4 bg-emerald-50/45 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  <MaterialIcon name="check_circle" className="text-xl" filled />
                  <span>Katılım kaydedildi</span>
                </div>
                <p className="mt-2 text-sm text-on-surface-variant">
                  {attendanceSlotLabel(activeSession)} için tekrar QR okutmanız gerekmez.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                  <MaterialIcon name="sensors" className="text-lg" />
                  <span>Yoklama şu anda açık</span>
                </div>
                <p className="mt-2 text-sm text-on-surface-variant">
                  {attendanceSlotLabel(activeSession)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2 sm:w-auto"
              >
                <MaterialIcon name="qr_code_scanner" className="text-xl" />
                QR Kodunu Tara
              </button>
            </div>
          )
        ) : (
          <div className="flex items-start gap-3 px-5 py-5 sm:px-6">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-container text-on-surface-variant">
              <MaterialIcon name="qr_code_2" className="text-xl" />
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface">Aktif yoklama yok</p>
              <p className="mt-1 text-sm leading-5 text-on-surface-variant">
                Öğretmeniniz oturumu başlattığında QR okutma düğmesi burada görünür.
              </p>
            </div>
          </div>
        )}
      </section>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-neutral-900">Yoklama Geçmişi</h2>
            <p className="text-xs text-neutral-500">
              Bu ders için gerçekleştirilen oturumlar ve katılım durumunuz tarih sırasıyla listelenmektedir.
            </p>
          </div>
          <span className="text-xs tabular-nums text-neutral-500">
            Toplam {data.history.length} oturum
          </span>
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-neutral-200/80 bg-white sm:block">
          <Table>
            <TableHead>
              <Th>Hafta / Oturum</Th>
              <Th>Tarih & Saat</Th>
              <Th>Durum</Th>
              <Th>Kayıt / Kaynak</Th>
            </TableHead>
            <TableBody>
              {data.history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-sm text-neutral-500">
                    <MaterialIcon name="history_toggle_off" className="text-3xl text-neutral-300 mx-auto" />
                    <p className="mt-2 font-medium text-neutral-700">Henüz yoklama oturumu yapılmamış</p>
                    <p className="text-xs text-neutral-400">
                      Öğretmeniniz yoklama başlattığında oturum kayıtları burada görünecektir.
                    </p>
                  </td>
                </tr>
              ) : (
                data.history.map((session) => {
                  const isAttended = session.isAttended || session.status === "PRESENT";
                  const isActivePending = session.status === "ACTIVE_PENDING";

                  return (
                    <TableRow key={session.sessionId}>
                      <Td>
                        <div className="min-w-0">
                          <span className="font-semibold text-xs text-neutral-900">
                            {session.slotType === "CALENDAR_PERIOD" && session.sessionDate
                              ? new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(new Date(session.sessionDate))
                              : `Hafta ${session.weekNumber}`}
                          </span>
                          <span className="block font-mono text-[11px] text-neutral-400">
                            {session.slotType === "CALENDAR_PERIOD"
                              ? `${session.lessonPeriod}. Ders`
                              : `${session.sessionIndexInWeek}. Oturum`}
                          </span>
                        </div>
                      </Td>

                      <Td>
                        <span className="font-mono text-xs text-neutral-800 block" suppressHydrationWarning>
                          {formatDateTime(session.startedAt)}
                        </span>
                        {session.sessionStatus === "ACTIVE" && (
                          <span className="text-[10px] font-semibold text-emerald-700">
                            Oturum Devam Ediyor
                          </span>
                        )}
                      </Td>

                      <Td>
                        {isAttended ? (
                          <Badge variant="success" className="gap-1">
                            <MaterialIcon name="check_circle" className="text-xs" />
                            Katıldı
                          </Badge>
                        ) : isActivePending ? (
                          <Badge variant="default" className="gap-1 bg-amber-50 text-amber-900 border-amber-200">
                            <MaterialIcon name="hourglass_top" className="text-xs" />
                            Yoklama Açık
                          </Badge>
                        ) : (
                          <Badge variant="error" className="gap-1">
                            <MaterialIcon name="cancel" className="text-xs" />
                            Devamsız
                          </Badge>
                        )}
                      </Td>

                      <Td>
                        <div className="text-xs text-neutral-600">
                          {session.source ? (
                            <span className="inline-flex items-center gap-1 font-medium text-neutral-700">
                              <MaterialIcon
                                name={session.source.includes("QR") ? "qr_code" : "edit_note"}
                                className="text-sm text-neutral-400"
                              />
                              {session.source}
                            </span>
                          ) : (
                            <span className="text-neutral-400">
                              {!isAttended ? "Katılım sağlanmadı" : "-"}
                            </span>
                          )}
                          {session.note && (
                            <p className="mt-0.5 text-[11px] text-neutral-400 italic">
                              {session.note}
                            </p>
                          )}
                        </div>
                      </Td>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="block overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0_8px_24px_rgba(25,28,30,0.05)] sm:hidden">
          {data.history.length === 0 ? (
            <div className="bg-white p-8 text-center text-sm text-neutral-500">
              <MaterialIcon name="history_toggle_off" className="text-3xl text-neutral-300 mx-auto" />
              <p className="mt-2 font-medium text-neutral-700">Henüz yoklama oturumu yapılmamış</p>
            </div>
          ) : (
            data.history.map((session) => {
              const isAttended = session.isAttended || session.status === "PRESENT";
              const isActivePending = session.status === "ACTIVE_PENDING";

              return (
                <div
                  key={session.sessionId}
                  className="space-y-2.5 border-b border-outline-variant px-4 py-4 last:border-b-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900">
                        {attendanceSlotLabel(session)}
                      </h4>
                      <span className="font-mono text-[11px] text-neutral-400 block mt-0.5" suppressHydrationWarning>
                        {formatDateTime(session.startedAt)}
                      </span>
                    </div>

                    {isAttended ? (
                      <Badge variant="success" className="gap-1 text-[11px]">
                        <MaterialIcon name="check_circle" className="text-xs" />
                        Katıldı
                      </Badge>
                    ) : isActivePending ? (
                      <Badge variant="default" className="gap-1 text-[11px] bg-amber-50 text-amber-900 border-amber-200">
                        <MaterialIcon name="hourglass_top" className="text-xs" />
                        Yoklama Açık
                      </Badge>
                    ) : (
                      <Badge variant="error" className="gap-1 text-[11px]">
                        <MaterialIcon name="cancel" className="text-xs" />
                        Devamsız
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-xs text-neutral-500 border-t border-neutral-100 pt-2">
                    <span>
                      Kaynak: <strong className="text-neutral-700">{session.source ?? (!isAttended ? "Katılmadı" : "-")}</strong>
                    </span>
                    {session.note && (
                      <span className="text-neutral-400 italic text-[11px]">
                        {session.note}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <StudentQrModal
        open={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        targetCourseId={course.id}
        targetCourseName={course.name}
        onSuccess={handleQrScanSuccess}
      />
    </div>
  );
}
