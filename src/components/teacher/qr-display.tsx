"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { CountdownBar, useCountdown } from "@/components/ui/countdown-bar";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/icons";
import { LiveIndicator } from "@/components/ui/live-indicator";
import { StatusMessage } from "@/components/ui/status-message";

type SessionState = {
  sessionId: string;
  courseName: string;
  courseCode: string;
  weekNumber: number;
  sessionIndexInWeek: number;
  presentCount: number;
  enrollmentCount: number;
  qrDataUrl: string;
  expiresAt: string;
  tokenLifetimeSeconds: number;
};

type QrDisplayProps = {
  courseId: string;
};

export function QrDisplay({ courseId }: QrDisplayProps) {
  const router = useRouter();
  const initializedRef = useRef(false);
  const [state, setState] = useState<SessionState>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  const fetchState = useCallback(async () => {
    const response = await fetch(`/api/courses/${courseId}/sessions/active`);
    const body = (await response.json()) as {
      data?: SessionState | null;
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new Error(body.error?.message ?? "Yoklama oturumu yüklenemedi.");
    }

    return body.data ?? null;
  }, [courseId]);

  const load = useCallback(async () => {
    setError(undefined);
    try {
      const data = await fetchState();
      setState(data ?? undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Yoklama oturumu yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [fetchState]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    void load();
  }, [load]);

  const sessionId = state?.sessionId;

  useEffect(() => {
    if (!sessionId) return;
    const id = window.setInterval(() => {
      void fetchState().then((data) => data && setState(data)).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(id);
  }, [fetchState, sessionId]);

  const expiresAt = state ? new Date(state.expiresAt).getTime() : 0;
  const { remainingSeconds, totalSeconds } = useCountdown({
    totalSeconds: state?.tokenLifetimeSeconds ?? 30,
    expiresAt: state ? expiresAt : 0,
    onExpire: state ? () => void load() : undefined,
  });
  const countdownDegrees = totalSeconds > 0 ? (remainingSeconds / totalSeconds) * 360 : 0;

  async function closeSession() {
    if (!window.confirm("Yoklamayı bitirmek istediğinize emin misiniz?")) return;

    setClosing(true);
    try {
      const response = await fetch(`/api/courses/${courseId}/sessions/active`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: { message?: string } };
        throw new Error(body.error?.message ?? "Yoklama bitirilemedi.");
      }
      router.push("/ogretmen");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Yoklama bitirilemedi.");
    } finally {
      setClosing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <p className="font-body-md text-body-md text-on-surface-variant">Yükleniyor…</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 bg-background px-4 text-center">
        {error && <StatusMessage variant="error">{error}</StatusMessage>}
        <div>
          <h2 className="font-h2 text-h2 text-on-surface">Yoklama oturumu yok</h2>
          <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
            {error
              ? "Yoklama oturumu yüklenirken bir sorun oluştu veya oturum sonlandırılmış olabilir."
              : "Oturumu başlattığınızda QR kodu burada görünecek ve öğrenciler okutabilecek."}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>
            {loading ? "Yenileniyor…" : "Tekrar Dene"}
          </Button>
          <Button variant="critical" onClick={() => void closeSession()} disabled={closing}>
            {closing ? "Bitiriliyor…" : "Oturumu Sıfırla / Sonlandır"}
          </Button>
          <Link
            href="/ogretmen"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-surface-container px-5 py-2.5 font-label-sm text-label-sm uppercase tracking-wider text-on-surface hover:bg-surface-container-high transition-colors"
          >
            Derslerime Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-surface-variant bg-surface-container-lowest/80 shadow-sm backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/ogretmen" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 font-label-sm text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary">
            <MaterialIcon name="arrow_back" /> Derslerim
          </Link>
          <p className="hidden font-h3 text-h3 text-on-surface sm:block">Yoklama Yönetimi</p>
          <Button variant="critical" size="sm" className="btn-lift press-scale px-6 py-2.5" onClick={() => void closeSession()} disabled={closing}>
            {closing ? "Bitiriliyor…" : "Oturumu Sonlandır"}
          </Button>
        </div>
      </header>

      <div className="animate-fade-in-up mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-label-sm text-label-sm text-secondary">{state.courseCode} · Hafta {state.weekNumber}, Oturum {state.sessionIndexInWeek}</p>
            <h1 className="mt-1 font-h1 text-h1 text-on-surface">{state.courseName}</h1>
          </div>
          <span className="w-fit rounded-full bg-primary-fixed px-3 py-1.5 font-label-sm text-label-sm text-on-primary-fixed-variant">
            {state.presentCount} / {state.enrollmentCount} öğrenci geldi
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section className="relative overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-6 text-center shadow-[0_4px_6px_rgba(0,0,0,0.04)] sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-secondary" aria-hidden="true" />
            <h2 className="font-h2 text-h2 text-on-surface">Yoklama QR Kodu</h2>
            <p className="mt-2 font-body-md text-body-md text-on-surface-variant">Öğrencilerin yoklamaya katılması için kodu taratın.</p>

            <div className="mx-auto mt-6 w-fit rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm sm:p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.qrDataUrl}
                alt="Yoklama QR kodu"
                width={400}
                height={400}
                className="size-[min(68vw,400px)]"
              />
            </div>

            <div className="mx-auto mt-6 flex w-fit items-center gap-3 rounded-full border border-outline-variant bg-surface-container-low px-5 py-2.5">
              <span
                className="grid size-10 place-items-center rounded-full p-1"
                style={{ background: `conic-gradient(var(--color-primary) ${countdownDegrees}deg, var(--color-outline-variant) 0deg)` }}
                aria-hidden="true"
              >
                <span className="grid size-full place-items-center rounded-full bg-surface-container-lowest font-label-sm text-label-sm font-bold text-primary">{remainingSeconds}</span>
              </span>
              <strong className="font-h3 text-h3 tabular-nums text-on-surface">{remainingSeconds} saniye</strong>
            </div>
            <p className="mt-3 font-body-md text-body-md text-on-surface-variant">QR otomatik yenileniyor</p>
            <CountdownBar totalSeconds={totalSeconds} remainingSeconds={remainingSeconds} className="mx-auto mt-4 max-w-md" />

            {error && <StatusMessage variant="error" className="mx-auto mt-4 max-w-md">{error}</StatusMessage>}
          </section>

          <aside className="h-fit overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0_4px_6px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between border-b border-outline-variant px-6 py-6">
              <div>
                <h2 className="font-h3 text-h3 text-on-surface">Canlı durum</h2>
                <p className="mt-1 font-label-sm text-label-sm text-on-surface-variant">Anlık katılım sayacı</p>
              </div>
              <LiveIndicator />
            </div>
            <div className="px-6 py-8 text-center">
              <p className="font-h1 text-h1 tabular-nums text-primary">{state.presentCount}</p>
              <p className="mt-2 font-body-md text-body-md text-on-surface-variant">{state.enrollmentCount} öğrenciden</p>
              <div className="mt-6 h-2 overflow-hidden rounded-full bg-surface-container-high" role="progressbar" aria-label="Katılım oranı" aria-valuemin={0} aria-valuemax={state.enrollmentCount} aria-valuenow={state.presentCount}>
                <div className="progress-gradient h-full rounded-full" style={{ width: `${state.enrollmentCount ? Math.min(100, (state.presentCount / state.enrollmentCount) * 100) : 0}%` }} />
              </div>
            </div>
            <div className="border-t border-outline-variant bg-surface-container-low px-6 py-4 text-center font-label-sm text-label-sm text-on-surface-variant">Yeni katılımlar 5 saniyede bir güncellenir</div>
          </aside>
        </div>
      </div>
    </div>
  );
}
