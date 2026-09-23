"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatusMessage } from "@/components/ui/status-message";

type AttendanceStartModalProps = {
  courseId: string;
  courseName: string;
  totalWeeks: number;
  weeklySessionCount: number;
  completedSessionCount: number;
};

export function AttendanceStartModal({
  courseId,
  courseName,
  totalWeeks,
  weeklySessionCount,
  completedSessionCount,
}: AttendanceStartModalProps) {
  const router = useRouter();
  const suggestedIndex = Math.min(
    completedSessionCount,
    Math.max(0, totalWeeks * weeklySessionCount - 1),
  );
  const [open, setOpen] = useState(false);
  const [weekNumber, setWeekNumber] = useState(
    Math.floor(suggestedIndex / weeklySessionCount) + 1,
  );
  const [sessionIndexInWeek, setSessionIndexInWeek] = useState(
    (suggestedIndex % weeklySessionCount) + 1,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ code?: string; message: string }>();

  async function startAttendance() {
    setSubmitting(true);
    setError(undefined);

    try {
      const response = await fetch(`/api/courses/${courseId}/sessions/active`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ weekNumber, sessionIndexInWeek }),
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

  return (
    <>
      <Button
        type="button"
        onClick={() => {
          setError(undefined);
          setOpen(true);
        }}
      >
        Yoklamayı Başlat
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Yoklama oturumunu seçin"
        description={`${courseName} için alınacak hafta ve ders oturumunu belirleyin.`}
        className="max-w-lg"
      >
        <div className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block font-label-sm text-label-sm text-on-surface">
              Hafta
              <select
                value={weekNumber}
                onChange={(event) => setWeekNumber(Number(event.target.value))}
                className="mt-1.5 min-h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 font-body-md text-body-md text-on-surface outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
              >
                {Array.from({ length: totalWeeks }, (_, index) => index + 1).map((week) => (
                  <option key={week} value={week}>Hafta {week}</option>
                ))}
              </select>
            </label>
            <label className="block font-label-sm text-label-sm text-on-surface">
              Ders oturumu
              <select
                value={sessionIndexInWeek}
                onChange={(event) => setSessionIndexInWeek(Number(event.target.value))}
                className="mt-1.5 min-h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 font-body-md text-body-md text-on-surface outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
              >
                {Array.from({ length: weeklySessionCount }, (_, index) => index + 1).map((sessionIndex) => (
                  <option key={sessionIndex} value={sessionIndex}>Oturum {sessionIndex}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 font-body-md text-body-md text-on-surface-variant">
            <strong className="text-on-surface">Seçim:</strong> Hafta {weekNumber}, Oturum {sessionIndexInWeek}
          </div>

          {error && (
            <div className="space-y-3">
              <StatusMessage variant="error">{error.message}</StatusMessage>
              {error.code === "SESSION_ALREADY_ACTIVE" && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setOpen(false);
                      router.push(`/ogretmen/ders/${courseId}/yoklama`);
                    }}
                  >
                    Aktif Oturuma Git
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={submitting}>
              Vazgeç
            </Button>
            <Button type="button" onClick={() => void startAttendance()} disabled={submitting}>
              {submitting ? "Başlatılıyor…" : "Seçili Yoklamayı Başlat"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
