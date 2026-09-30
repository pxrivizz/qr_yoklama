"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StudentQrModal } from "./student-qr-modal";
import { MaterialIcon } from "@/components/ui/icons";
import type { StudentActiveSessionItem } from "@/lib/attendance/session-service";
import { formatPreparatorySlot } from "@/lib/attendance/slot";

type ActiveAttendanceBannerProps = {
  initialSessions?: StudentActiveSessionItem[];
};

export function ActiveAttendanceBanner({ initialSessions = [] }: ActiveAttendanceBannerProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState<StudentActiveSessionItem[]>(initialSessions);
  const [selectedSession, setSelectedSession] = useState<StudentActiveSessionItem | null>(null);

  async function refreshActiveSessions() {
    try {
      const res = await fetch("/api/student/active-sessions");
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setSessions(json.data);
        }
      }
    } catch {
      // Ignore polling errors
    }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      void refreshActiveSessions();
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const pendingSessions = sessions.filter((s) => !s.alreadyAttended);

  if (pendingSessions.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-3" aria-live="polite">
        {pendingSessions.map((session) => (
          <section
            key={session.sessionId}
            aria-label={`${session.courseName} için açık yoklama`}
            className="relative overflow-hidden rounded-xl border border-emerald-200 bg-surface-container-lowest shadow-[0_8px_24px_rgba(0,108,73,0.08)]"
          >
            <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                  <MaterialIcon name="sensors" className="text-lg" />
                  <span>Yoklama şu anda açık</span>
                </div>
                <h2 className="mt-2 text-lg font-bold tracking-[-0.01em] text-on-surface sm:text-xl">
                  {session.courseName}
                </h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {session.courseCode} <span aria-hidden="true">·</span>{" "}
                  {session.slotType === "CALENDAR_PERIOD" && session.sessionDate && session.lessonPeriod
                    ? formatPreparatorySlot(session.sessionDate, session.lessonPeriod)
                    : `Hafta ${session.weekNumber}, ${session.sessionIndexInWeek}. oturum`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSession(session)}
                className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2 sm:w-auto"
              >
                <MaterialIcon name="qr_code_scanner" className="text-xl" />
                QR Kodunu Tara
              </button>
            </div>
          </section>
        ))}
      </div>

      {selectedSession && (
        <StudentQrModal
          open={Boolean(selectedSession)}
          onClose={() => {
            setSelectedSession(null);
            void refreshActiveSessions();
            router.refresh();
          }}
          targetCourseId={selectedSession.courseId}
          targetCourseName={selectedSession.courseName}
        />
      )}
    </>
  );
}
