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

export function CourseDetailView({ initialData }: CourseDetailViewProps) {
  const [data, setData] = useState<StudentCourseAttendanceDetail>(initialData);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isRefreshing, startTransition] = useTransition();
  const [successToast, setSuccessToast] = useState<string | null>(null);

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

  function handleQrScanSuccess(scannedCourseName: string) {
    setSuccessToast(`Yoklamanız başarıyla alındı (${scannedCourseName}).`);
    void refetchData();
    setTimeout(() => {
      setSuccessToast(null);
    }, 6000);
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex flex-col gap-4 border-b border-neutral-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/ogrenci"
            className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <MaterialIcon name="arrow_back" className="text-base" /> Öğrenci Paneline Dön
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
              {course.code}
            </span>
            {data.enrollment.isMandatory && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200">
                Zorunlu Ders
              </span>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            {course.name}
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Öğretim Üyesi: <span className="font-medium text-neutral-800">{course.teacher.name ?? course.teacher.email}</span>
            {" · "}Öğrenci No: <span className="font-mono text-neutral-800">{data.enrollment.schoolNumberOnList}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void refetchData()}
            disabled={isRefreshing}
            className="border border-neutral-200 text-xs shadow-none gap-1.5"
          >
            <MaterialIcon
              name="sync"
              className={cn("text-base", isRefreshing && "animate-spin")}
            />
            Yenile
          </Button>
        </div>
      </div>

      {successToast && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 shadow-sm animate-fade-in-up">
          <MaterialIcon name="check_circle" className="text-2xl text-emerald-600 shrink-0" />
          <div className="text-sm font-semibold">{successToast}</div>
        </div>
      )}

      {summary.hasLimit && (
        <div>
          {summary.isFailed ? (
            <div className="flex items-start gap-3 rounded-2xl border-2 border-red-400 bg-red-50/90 p-4 text-red-900 shadow-sm">
              <MaterialIcon name="cancel" className="text-2xl text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm text-red-900">Devamsızlıktan Kaldınız!</h3>
                <p className="mt-0.5 text-xs text-red-800 leading-relaxed">
                  Bu ders için izin verilen devamsızlık sınırını ({summary.limit} oturum) aştınız. Toplam devamsızlığınız: <strong>{summary.totalAbsenceCount} oturum</strong>.
                </p>
              </div>
            </div>
          ) : summary.isAtLimit ? (
            <div className="flex items-start gap-3 rounded-2xl border-2 border-red-300 bg-red-50/80 p-4 text-red-900 shadow-sm">
              <MaterialIcon name="warning" className="text-2xl text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm text-red-900">Devamsızlık Sınırındasınız!</h3>
                <p className="mt-0.5 text-xs text-red-800 leading-relaxed">
                  İzin verilen son devamsızlık hakkınızı kullandınız ({summary.totalAbsenceCount}/{summary.limit} oturum). Bir sonraki devamsızlığınızda dersten kalacaksınız!
                </p>
              </div>
            </div>
          ) : summary.isNearLimit ? (
            <div className="flex items-start gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50/90 p-4 text-amber-900 shadow-sm">
              <MaterialIcon name="error_outline" className="text-2xl text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm text-amber-900">Dikkat: Devamsızlık Sınırına Yaklaştınız</h3>
                <p className="mt-0.5 text-xs text-amber-800 leading-relaxed">
                  Toplam {summary.totalAbsenceCount} devamsızlığınız bulunuyor. Sınıra ({summary.limit} oturum) sadece <strong>1 oturum kaldı</strong>. Lütfen derslere düzenli katılın.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-emerald-900 shadow-sm">
              <MaterialIcon name="verified" className="text-xl text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-xs text-emerald-900">Devamsızlık Durumu Güvenli</h3>
                <p className="mt-0.5 text-xs text-emerald-700">
                  Devamsızlık sınırına ulaşmadınız ({summary.totalAbsenceCount}/{summary.limit} oturum). Kalan izin hakkı: <strong>{summary.remainingAllowance} oturum</strong>.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
          Ders Devamsızlık Özeti
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-neutral-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500">Toplam Devamsızlık</span>
              <span className="grid size-7 place-items-center rounded-lg bg-neutral-100 text-neutral-600">
                <MaterialIcon name="event_busy" className="text-base" />
              </span>
            </div>
            <p className={cn(
              "mt-2 text-2xl font-bold tracking-tight tabular-nums",
              summary.isFailed || summary.isAtLimit ? "text-red-600" : "text-neutral-900",
            )}>
              {summary.totalAbsenceCount}
            </p>
            <span className="mt-0.5 block text-[11px] text-neutral-400">
              {summary.hasLimit ? `Sınır: ${summary.limit} oturum` : "Sınır belirtilmedi"}
            </span>
          </div>

          <div className="rounded-xl border border-neutral-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-700">Katıldığı Ders Sayısı</span>
              <span className="grid size-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                <MaterialIcon name="check_circle" className="text-base" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-700 tabular-nums">
              {summary.attendedCount} <span className="text-sm font-normal text-neutral-400">/ {summary.totalSessions}</span>
            </p>
            <span className="mt-0.5 block text-[11px] text-neutral-400">Tamamlanan oturum</span>
          </div>

          <div className="rounded-xl border border-neutral-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-600">Kalan Devamsızlık Hakkı</span>
              <span className="grid size-7 place-items-center rounded-lg bg-neutral-100 text-neutral-600">
                <MaterialIcon name="pending_actions" className="text-base" />
              </span>
            </div>
            <p className={cn(
              "mt-2 text-2xl font-bold tracking-tight tabular-nums",
              summary.remainingAllowance !== null && summary.remainingAllowance <= 0
                ? "text-red-600"
                : summary.remainingAllowance === 1
                ? "text-amber-600"
                : "text-neutral-900",
            )}>
              {summary.hasLimit && summary.remainingAllowance !== null
                ? `${summary.remainingAllowance} oturum`
                : "Belirtilmedi"}
            </p>
            <span className="mt-0.5 block text-[11px] text-neutral-400">
              {summary.hasLimit ? (summary.isFailed ? "Sınır aşıldı" : summary.isAtLimit ? "Sınırda" : "Kalan hak") : "Öğretmen sınır belirlemedi"}
            </span>
          </div>

          <div className="rounded-xl border border-neutral-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-600">Katılım Oranı</span>
              <span className="grid size-7 place-items-center rounded-lg bg-neutral-100 text-neutral-600">
                <MaterialIcon name="pie_chart" className="text-base" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-neutral-900 tabular-nums">
              %{summary.attendanceRate}
            </p>
            <span className="mt-0.5 block text-[11px] text-neutral-400">
              Devamsızlık Oranı: %{summary.absencePercentage}
            </span>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
          QR ile Yoklama
        </h2>

        {activeSession ? (
          activeSession.alreadyAttended ? (
            <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm transition-all sm:p-6">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500" />
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3.5">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <MaterialIcon name="verified" className="text-2xl" filled />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        Yoklamanız Alındı
                      </span>
                      <span className="text-xs text-neutral-400">•</span>
                      <span className="text-xs font-medium text-neutral-500">
                        Hafta {activeSession.weekNumber}, {activeSession.sessionIndexInWeek}. Oturum
                      </span>
                    </div>
                    <h3 className="mt-1 text-base font-bold text-neutral-900">
                      Katılımınız Başarıyla Kaydedildi
                    </h3>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      Bu aktif oturum için yoklama kaydınız sistemde mevcuttur. Tekrar okutmanıza gerek yoktur.
                    </p>
                  </div>
                </div>

                <div className="flex items-center self-start sm:self-center">
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 px-3.5 py-2 text-xs font-semibold text-emerald-800">
                    <MaterialIcon name="check_circle" className="text-base text-emerald-600" />
                    Katılım Onaylandı
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-emerald-200/90 bg-white p-5 shadow-[0_4px_24px_-4px_rgba(16,185,129,0.12)] transition-all sm:p-6">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500" />

              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200/70 px-3 py-1 text-xs font-bold text-emerald-700">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    YOKLAMA AÇIK
                  </div>

                  <div className="flex items-center gap-1.5 rounded-lg bg-neutral-100/80 px-2.5 py-1 text-xs font-medium text-neutral-600">
                    <span className="font-semibold text-neutral-800">Hafta {activeSession.weekNumber}</span>
                    <span className="text-neutral-300">•</span>
                    <span>{activeSession.sessionIndexInWeek}. Oturum</span>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold tracking-tight text-neutral-900 sm:text-xl">
                      {course.name}
                    </h3>
                    <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                      Öğretmen ekranındaki QR kodu kameraya göstererek derse katılımınızı onaylayın.
                    </p>
                  </div>

                  <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                    <MaterialIcon name="qr_code_scanner" className="text-2xl" />
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setIsQrModalOpen(true)}
                    className="w-full inline-flex h-12 items-center justify-center gap-2.5 rounded-xl bg-neutral-900 px-6 font-semibold text-sm text-white shadow-sm transition-all hover:bg-neutral-800 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2"
                  >
                    <MaterialIcon name="photo_camera" className="text-lg text-emerald-400" />
                    <span>QR Kodu Tara ve Katıl</span>
                  </button>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-neutral-200/60 text-neutral-400">
                  <MaterialIcon name="qr_code_2" className="text-2xl" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-800">
                    Bu ders için şu anda aktif yoklama yok
                  </h3>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Öğretmeniniz yoklama başlattığında burada QR kod okutma butonu açılacaktır.
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 self-start sm:self-center rounded-lg border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-400">
                <MaterialIcon name="lock" className="text-sm" />
                Oturum Kapalı
              </span>
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-neutral-900">Yoklama Geçmişi</h2>
            <p className="text-xs text-neutral-500">
              Bu ders için gerçekleştirilen oturumlar ve katılım durumunuz tarih sırasıyla listelenmektedir.
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-500">
            Toplam {data.history.length} oturum
          </span>
        </div>

        <div className="hidden sm:block overflow-hidden rounded-xl border border-neutral-200/80 bg-white shadow-sm">
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
                            Hafta {session.weekNumber}
                          </span>
                          <span className="block font-mono text-[11px] text-neutral-400">
                            {session.sessionIndexInWeek}. Oturum
                          </span>
                        </div>
                      </Td>

                      <Td>
                        <span className="font-mono text-xs text-neutral-800 block" suppressHydrationWarning>
                          {formatDateTime(session.startedAt)}
                        </span>
                        {session.sessionStatus === "ACTIVE" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
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

        <div className="block sm:hidden space-y-3">
          {data.history.length === 0 ? (
            <div className="rounded-xl border border-neutral-200/80 bg-white p-8 text-center text-sm text-neutral-500">
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
                  className="rounded-xl border border-neutral-200/80 bg-white p-4 shadow-sm space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900">
                        Hafta {session.weekNumber} · {session.sessionIndexInWeek}. Oturum
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
