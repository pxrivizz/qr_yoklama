"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/ui/icons";
import { StudentQrModal } from "./student-qr-modal";
import type { StudentActiveSessionItem } from "@/lib/attendance/session-service";

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

  // Poll for active sessions every 10 seconds
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
      <div className="space-y-3">
        {pendingSessions.map((session) => (
          <div
            key={session.sessionId}
            className="relative overflow-hidden rounded-2xl border border-emerald-200/90 bg-white p-5 shadow-[0_4px_24px_-4px_rgba(16,185,129,0.12)] transition-all sm:p-6 animate-fade-in-up"
          >
            {/* Sol Durum Şeridi */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500" />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3.5">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                  <MaterialIcon name="qr_code_scanner" className="text-2xl" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      YOKLAMA AÇIK
                    </span>
                    <span className="text-xs text-neutral-400">•</span>
                    <span className="text-xs font-semibold text-neutral-700">
                      {session.courseCode}
                    </span>
                    <span className="text-xs text-neutral-400">•</span>
                    <span className="text-xs text-neutral-500">
                      Hafta {session.weekNumber}, {session.sessionIndexInWeek}. Oturum
                    </span>
                  </div>

                  <h2 className="mt-1 text-base font-bold text-neutral-900 sm:text-lg">
                    {session.courseName}
                  </h2>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Öğretmen ekranındaki QR kodu kameraya göstererek katılımınızı onaylayın.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => setSelectedSession(session)}
                  className="w-full sm:w-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:scale-[0.99] px-5 text-xs font-semibold text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2"
                >
                  <MaterialIcon name="photo_camera" className="text-base text-emerald-400" />
                  <span>QR Kodu Tara ve Katıl</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedSession && (
        <StudentQrModal
          open={Boolean(selectedSession)}
          onClose={() => setSelectedSession(null)}
          targetCourseId={selectedSession.courseId}
          targetCourseName={selectedSession.courseName}
          onSuccess={() => {
            void refreshActiveSessions();
            router.refresh();
          }}
        />
      )}
    </>
  );
}
