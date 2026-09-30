"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, signOut } from "next-auth/react";

const IDLE_TIMEOUT_MS = 20 * 60 * 1000;
const ACTIVITY_WRITE_INTERVAL_MS = 15 * 1000;
const LAST_ACTIVITY_KEY = "qr-yoklama:last-activity";

export function SessionIdleGuard() {
  const router = useRouter();
  const [isEndingSession, setIsEndingSession] = useState(false);

  useEffect(() => {
    let timeoutId: number | undefined;
    let disposed = false;
    let signingOut = false;
    let lastActivityWrite = 0;

    const readLastActivity = () => {
      const storedValue = Number(window.localStorage.getItem(LAST_ACTIVITY_KEY));
      return Number.isFinite(storedValue) && storedValue > 0 ? storedValue : Date.now();
    };

    const endSession = async () => {
      if (disposed || signingOut) return;
      signingOut = true;
      setIsEndingSession(true);
      window.localStorage.removeItem(LAST_ACTIVITY_KEY);

      try {
        await signOut({ redirectTo: "/giris?oturum=zaman-asimi" });
      } catch {
        router.replace("/giris?oturum=zaman-asimi");
      }
    };

    const scheduleTimeout = () => {
      if (timeoutId) window.clearTimeout(timeoutId);

      const remaining = IDLE_TIMEOUT_MS - (Date.now() - readLastActivity());
      if (remaining <= 0) {
        void endSession();
        return;
      }

      timeoutId = window.setTimeout(scheduleTimeout, remaining);
    };

    const recordActivity = () => {
      const now = Date.now();
      if (signingOut || now - lastActivityWrite < ACTIVITY_WRITE_INTERVAL_MS) return;

      lastActivityWrite = now;
      window.localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      scheduleTimeout();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === LAST_ACTIVITY_KEY) scheduleTimeout();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - readLastActivity() >= IDLE_TIMEOUT_MS) {
        void endSession();
        return;
      }
      recordActivity();
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "keydown",
      "pointerdown",
      "pointermove",
      "scroll",
      "touchstart",
    ];

    const initialize = async () => {
      const session = await getSession();
      if (disposed || !session?.user) return;

      const now = Date.now();
      lastActivityWrite = now;
      window.localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      scheduleTimeout();

      for (const eventName of activityEvents) {
        window.addEventListener(eventName, recordActivity, { passive: true });
      }
      window.addEventListener("storage", handleStorage);
      document.addEventListener("visibilitychange", handleVisibilityChange);
    };

    void initialize();

    return () => {
      disposed = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, recordActivity);
      }
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  if (!isEndingSession) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-neutral-50 px-6 text-center"
      role="status"
      aria-live="assertive"
    >
      <div>
        <p className="text-base font-semibold text-neutral-900">Oturumunuz sonlandırılıyor</p>
        <p className="mt-1 text-sm text-neutral-600">
          Güvenliğiniz için 20 dakikalık hareketsizlik süresi doldu.
        </p>
      </div>
    </div>
  );
}
