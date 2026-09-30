"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatusMessage } from "@/components/ui/status-message";
import {
  formatPreparatorySlot,
  lessonCountForDate,
  todayInIstanbul,
  type PreparatoryDayPlan,
} from "@/lib/attendance/slot";

type CompletedSession = {
  id: string;
  slotType: "WEEKLY" | "CALENDAR_PERIOD";
  weekNumber: number | null;
  sessionIndexInWeek: number | null;
  sessionDate: string | null;
  lessonPeriod: number | null;
};

type AttendanceStartModalProps = {
  courseId: string;
  courseName: string;
  attendanceMode: "STANDARD" | "PREPARATORY";
  preparatoryDayPlans: PreparatoryDayPlan[];
  totalWeeks: number;
  weeklySessionCount: number;
  completedSessions: CompletedSession[];
};

function weeklySlotKey(weekNumber: number, sessionIndexInWeek: number) {
  return `weekly:${weekNumber}:${sessionIndexInWeek}`;
}

function preparatorySlotKey(sessionDate: string, lessonPeriod: number) {
  return `preparatory:${sessionDate}:${lessonPeriod}`;
}

export function AttendanceStartModal({
  courseId,
  courseName,
  attendanceMode,
  preparatoryDayPlans,
  totalWeeks,
  weeklySessionCount,
  completedSessions,
}: AttendanceStartModalProps) {
  const router = useRouter();
  const preparatory = attendanceMode === "PREPARATORY";
  const completedKeys = useMemo(
    () => completedSessions.map((session) =>
      session.slotType === "CALENDAR_PERIOD" && session.sessionDate && session.lessonPeriod
        ? preparatorySlotKey(session.sessionDate, session.lessonPeriod)
        : weeklySlotKey(session.weekNumber ?? 0, session.sessionIndexInWeek ?? 0),
    ),
    [completedSessions],
  );
  const suggestedIndex = Array.from(
    { length: totalWeeks * weeklySessionCount },
    (_, index) => index,
  ).find((index) => !completedKeys.includes(
    weeklySlotKey(Math.floor(index / weeklySessionCount) + 1, (index % weeklySessionCount) + 1),
  )) ?? Math.max(0, totalWeeks * weeklySessionCount - 1);

  const [open, setOpen] = useState(false);
  const [weekNumber, setWeekNumber] = useState(
    Math.floor(suggestedIndex / weeklySessionCount) + 1,
  );
  const [sessionIndexInWeek, setSessionIndexInWeek] = useState(
    (suggestedIndex % weeklySessionCount) + 1,
  );
  const [sessionDate, setSessionDate] = useState(() => todayInIstanbul());
  const [lessonPeriod, setLessonPeriod] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [removedSessionIds, setRemovedSessionIds] = useState<string[]>([]);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [error, setError] = useState<{ code?: string; message: string }>();
  const selectedDayLessonCount = sessionDate
    ? lessonCountForDate(preparatoryDayPlans, sessionDate)
    : 0;

  const selectedSessionKey = preparatory
    ? preparatorySlotKey(sessionDate, lessonPeriod)
    : weeklySlotKey(weekNumber, sessionIndexInWeek);
  const selectedCompletedSession = completedSessions.find((session) => {
    if (removedSessionIds.includes(session.id)) return false;
    return session.slotType === "CALENDAR_PERIOD" && session.sessionDate && session.lessonPeriod
      ? preparatorySlotKey(session.sessionDate, session.lessonPeriod) === selectedSessionKey
      : weeklySlotKey(session.weekNumber ?? 0, session.sessionIndexInWeek ?? 0) === selectedSessionKey;
  });

  function clearSelectionState() {
    setShowResetConfirmation(false);
    setResetConfirmation("");
    setResetSuccess(false);
    setError(undefined);
  }

  async function startAttendance() {
    if (preparatory && selectedDayLessonCount === 0) {
      setError({ message: "Seçilen gün için ders tanımlanmamış." });
      return;
    }
    setSubmitting(true);
    setError(undefined);

    try {
      const response = await fetch(`/api/courses/${courseId}/sessions/active`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          preparatory
            ? { sessionDate, lessonPeriod }
            : { weekNumber, sessionIndexInWeek },
        ),
      });
      const body = (await response.json()) as { error?: { code?: string; message?: string } };
      if (!response.ok) {
        setError({
          code: body.error?.code,
          message: body.error?.message ?? "Yoklama başlatılamadı.",
        });
        return;
      }

      setOpen(false);
      router.push(`/ogretmen/ders/${courseId}/yoklama`);
      router.refresh();
    } catch (caught) {
      setError({
        message: caught instanceof Error ? caught.message : "Yoklama başlatılamadı.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function resetSelectedAttendanceSession() {
    if (!selectedCompletedSession) return;
    setResetting(true);
    setError(undefined);
    setResetSuccess(false);

    try {
      const response = await fetch(`/api/courses/${courseId}/attendance/reset`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: selectedCompletedSession.id,
          confirmation: resetConfirmation,
        }),
      });
      const body = (await response.json()) as { error?: { code?: string; message?: string } };
      if (!response.ok) {
        setError({
          code: body.error?.code,
          message: body.error?.message ?? "Oturum yoklaması sıfırlanamadı.",
        });
        return;
      }

      setRemovedSessionIds((current) => [...current, selectedCompletedSession.id]);
      setResetConfirmation("");
      setShowResetConfirmation(false);
      setResetSuccess(true);
      router.refresh();
    } catch (caught) {
      setError({
        message: caught instanceof Error ? caught.message : "Oturum yoklaması sıfırlanamadı.",
      });
    } finally {
      setResetting(false);
    }
  }

  const selectionLabel = preparatory
    ? sessionDate
      ? selectedDayLessonCount > 0
        ? formatPreparatorySlot(sessionDate, lessonPeriod)
        : "Seçilen günde ders yok"
      : "Tarih seçilmedi"
    : `Hafta ${weekNumber}, Oturum ${sessionIndexInWeek}`;

  return (
    <>
      <Button
        type="button"
        onClick={() => {
          clearSelectionState();
          setOpen(true);
        }}
      >
        Yoklamayı Başlat
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Yoklama oturumunu seçin"
        description={preparatory
          ? `${courseName} için tarihi ve o günkü ders sırasını belirleyin.`
          : `${courseName} için alınacak hafta ve ders oturumunu belirleyin.`}
        className="max-w-lg"
      >
        <div className="grid gap-5">
          {preparatory ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block font-label-sm text-label-sm text-on-surface">
                Yoklama tarihi
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(event) => {
                    setSessionDate(event.target.value);
                    setLessonPeriod(1);
                    clearSelectionState();
                  }}
                  className="mt-1.5 min-h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 font-body-md text-body-md text-on-surface outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                />
              </label>
              <label className="block font-label-sm text-label-sm text-on-surface">
                Ders sırası
                <select
                  value={lessonPeriod}
                  disabled={selectedDayLessonCount === 0}
                  onChange={(event) => {
                    setLessonPeriod(Number(event.target.value));
                    clearSelectionState();
                  }}
                  className="mt-1.5 min-h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 font-body-md text-body-md text-on-surface outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                >
                  {selectedDayLessonCount === 0 ? (
                    <option value={1}>Seçilen gün ders yok</option>
                  ) : Array.from({ length: selectedDayLessonCount }, (_, index) => index + 1)
                    .map((period) => <option key={period} value={period}>{period}. ders</option>)}
                </select>
              </label>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block font-label-sm text-label-sm text-on-surface">
                Hafta
                <select
                  value={weekNumber}
                  onChange={(event) => {
                    setWeekNumber(Number(event.target.value));
                    clearSelectionState();
                  }}
                  className="mt-1.5 min-h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 font-body-md text-body-md text-on-surface outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                >
                  {Array.from({ length: totalWeeks }, (_, index) => index + 1)
                    .map((week) => <option key={week} value={week}>Hafta {week}</option>)}
                </select>
              </label>
              <label className="block font-label-sm text-label-sm text-on-surface">
                Ders oturumu
                <select
                  value={sessionIndexInWeek}
                  onChange={(event) => {
                    setSessionIndexInWeek(Number(event.target.value));
                    clearSelectionState();
                  }}
                  className="mt-1.5 min-h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 font-body-md text-body-md text-on-surface outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                >
                  {Array.from({ length: weeklySessionCount }, (_, index) => index + 1)
                    .map((index) => <option key={index} value={index}>Oturum {index}</option>)}
                </select>
              </label>
            </div>
          )}

          <div className="rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 font-body-md text-body-md text-on-surface-variant">
            <strong className="text-on-surface">Seçim:</strong> {selectionLabel}
          </div>

          {error && (
            <div className="space-y-3">
              <StatusMessage variant="error">{error.message}</StatusMessage>
              {error.code === "SESSION_ALREADY_ACTIVE" && (
                <div className="flex justify-end">
                  <Button type="button" size="sm" onClick={() => {
                    setOpen(false);
                    router.push(`/ogretmen/ders/${courseId}/yoklama`);
                  }}>
                    Aktif Oturuma Git
                  </Button>
                </div>
              )}
            </div>
          )}

          {resetSuccess && (
            <StatusMessage variant="success" title="Oturum yoklaması sıfırlandı">
              {selectionLabel} yeniden başlatılmaya hazır.
            </StatusMessage>
          )}

          {selectedCompletedSession && (
            <section className="border-t border-outline-variant pt-5" aria-labelledby="attendance-reset-title">
              <h3 id="attendance-reset-title" className="font-semibold text-error">
                Bu oturumun yoklamasını sıfırla
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
                {selectionLabel} için alınmış yoklama ve ilişkili kayıtlar kalıcı olarak silinir.
              </p>
              {!showResetConfirmation ? (
                <Button
                  type="button"
                  variant="danger"
                  className="mt-3"
                  onClick={() => setShowResetConfirmation(true)}
                  disabled={submitting || resetting}
                >
                  Bu oturumun yoklamasını sıfırla
                </Button>
              ) : (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50/70 p-4">
                  <label className="block text-sm font-medium text-red-950">
                    Onaylamak için <strong>SIFIRLA</strong> yazın
                    <input
                      value={resetConfirmation}
                      onChange={(event) => setResetConfirmation(event.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                      className="mt-2 min-h-11 w-full rounded-lg border border-red-300 bg-white px-3 text-sm text-on-surface outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                    />
                  </label>
                  <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="secondary" size="sm" onClick={() => {
                      setShowResetConfirmation(false);
                      setResetConfirmation("");
                    }} disabled={resetting}>
                      İptal
                    </Button>
                    <Button type="button" variant="critical" size="sm" onClick={() => void resetSelectedAttendanceSession()} disabled={resetting || resetConfirmation !== "SIFIRLA"}>
                      {resetting ? "Sıfırlanıyor…" : "Bu Oturumu Sıfırla"}
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={submitting || resetting}>
              Vazgeç
            </Button>
            <Button type="button" onClick={() => void startAttendance()} disabled={submitting || resetting || Boolean(selectedCompletedSession) || !sessionDate || (preparatory && selectedDayLessonCount === 0)}>
              {submitting
                ? "Başlatılıyor…"
                : selectedCompletedSession
                  ? "Bu Oturum Daha Önce Alındı"
                  : "Seçili Yoklamayı Başlat"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
