"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/icons";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { StatusMessage } from "@/components/ui/status-message";
import { cn } from "@/lib/cn";

type BugReportStatus = "PENDING" | "IN_PROGRESS" | "FIXED";

type MyBugReport = {
  id: string;
  subject: string;
  description: string;
  status: BugReportStatus;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  responses: Array<{
    id: string;
    message: string;
    createdAt: string;
    author: { name: string | null; role: "ADMIN" | "TEACHER" | "STUDENT" };
  }>;
};

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; reportId: string }
  | { kind: "error"; message: string };

type HistoryState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; reports: MyBugReport[] }
  | { kind: "error"; message: string };

const statusMeta = {
  PENDING: { label: "Bekliyor", variant: "default" as const, icon: "schedule", description: "Yetkili incelemesi bekleniyor." },
  IN_PROGRESS: { label: "İşlemde", variant: "info" as const, icon: "construction", description: "Bildiriminiz üzerinde çalışılıyor." },
  FIXED: { label: "Çözüldü", variant: "success" as const, icon: "check_circle", description: "Bildirilen sorun çözüldü." },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function BugReportWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [selectedReport, setSelectedReport] = useState<MyBugReport | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [state, setState] = useState<SubmitState>({ kind: "idle" });
  const [history, setHistory] = useState<HistoryState>({ kind: "idle" });
  const previewUrl = useMemo(
    () => (screenshot ? URL.createObjectURL(screenshot) : undefined),
    [screenshot],
  );

  const visible = pathname.startsWith("/ogrenci") || pathname.startsWith("/ogretmen") || pathname === "/tara";

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (open && history.kind === "idle") void loadHistory();
  }, [open, history.kind]);

  async function loadHistory() {
    setHistory({ kind: "loading" });
    try {
      const response = await fetch("/api/bug-reports/mine", { cache: "no-store" });
      const body = (await response.json()) as {
        data?: { reports: MyBugReport[] };
        error?: { message?: string };
      };
      if (!response.ok || !body.data) {
        throw new Error(body.error?.message ?? "Bildirim geçmişiniz yüklenemedi.");
      }
      setHistory({ kind: "ready", reports: body.data.reports });
      setSelectedReport((current) =>
        current ? body.data?.reports.find((report) => report.id === current.id) ?? current : null,
      );
    } catch (error) {
      setHistory({
        kind: "error",
        message: error instanceof Error ? error.message : "Bildirim geçmişiniz yüklenemedi.",
      });
    }
  }

  function close() {
    setOpen(false);
    setActiveTab("new");
    setSelectedReport(null);
    setScreenshot(null);
    setState({ kind: "idle" });
  }

  function showHistory() {
    setSelectedReport(null);
    setActiveTab("history");
    setState({ kind: "idle" });
    if (history.kind === "error") void loadHistory();
  }

  function showNewReport() {
    setSelectedReport(null);
    setActiveTab("new");
    if (state.kind === "success") setState({ kind: "idle" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!screenshot) {
      setState({ kind: "error", message: "Lütfen hatayı gösteren bir ekran görüntüsü ekleyin." });
      return;
    }

    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("screenshot", screenshot);
    data.set("pageUrl", window.location.pathname);
    setState({ kind: "submitting" });

    try {
      const response = await fetch("/api/bug-reports", { method: "POST", body: data });
      const body = (await response.json()) as {
        data?: { id?: string };
        error?: { message?: string; fields?: Record<string, string[] | undefined> };
      };
      if (!response.ok) {
        const fieldMessage = body.error?.fields
          ? Object.values(body.error.fields).flat().find(Boolean)
          : undefined;
        throw new Error(fieldMessage ?? body.error?.message ?? "Hata bildirimi gönderilemedi.");
      }

      form.reset();
      setScreenshot(null);
      setState({ kind: "success", reportId: body.data?.id ?? "" });
      await loadHistory();
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Hata bildirimi gönderilemedi.",
      });
    }
  }

  if (!visible) return null;

  const title = selectedReport
    ? selectedReport.subject
    : state.kind === "success"
      ? "Hata bildiriminiz alındı"
      : activeTab === "history"
        ? "Bildirimlerim"
        : "Hata bildir";

  const description = selectedReport
    ? `Gönderim: ${formatDate(selectedReport.createdAt)}`
    : state.kind === "success"
      ? "Bildiriminizi bu penceredeki Bildirimlerim bölümünden takip edebilirsiniz."
      : activeTab === "history"
        ? "Daha önce gönderdiğiniz bildirimlerin durumlarını ve yetkili yanıtlarını görüntüleyin."
        : "Sorunu yeniden oluşturabilmemiz için kısa bir konu, açıklama ve ekran görüntüsü ekleyin.";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-30 inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 shadow-[0_8px_28px_rgba(80,20,20,0.16)] transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:bottom-6 sm:right-6"
        aria-label="Hata bildir veya önceki bildirimlerini görüntüle"
      >
        <MaterialIcon name="bug_report" className="text-lg" />
        <span>Hata bildir</span>
      </button>

      <Modal
        open={open}
        onClose={close}
        title={title}
        description={description}
        className="max-w-2xl"
      >
        {!selectedReport && state.kind !== "success" && (
          <div className="mb-6 grid grid-cols-2 rounded-xl bg-surface-container-low p-1" role="tablist" aria-label="Hata bildirimleri">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "new"}
              onClick={showNewReport}
              className={cn(
                "min-h-10 rounded-lg px-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                activeTab === "new" ? "bg-white text-on-surface shadow-sm" : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              Yeni bildirim
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "history"}
              onClick={showHistory}
              className={cn(
                "min-h-10 rounded-lg px-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                activeTab === "history" ? "bg-white text-on-surface shadow-sm" : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              Bildirimlerim
              {history.kind === "ready" && history.reports.length > 0 && (
                <span className="ml-1.5 tabular-nums text-xs">({history.reports.length})</span>
              )}
            </button>
          </div>
        )}

        {selectedReport ? (
          <ReportDetail report={selectedReport} onBack={showHistory} />
        ) : state.kind === "success" ? (
          <div className="py-4 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
              <MaterialIcon name="check_circle" className="text-3xl" />
            </div>
            <p className="mx-auto mt-4 max-w-sm text-sm text-on-surface-variant">
              Rapor numaranız: <strong className="break-all text-on-surface">{state.reportId}</strong>
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
              <Button type="button" variant="secondary" onClick={close}>Kapat</Button>
              <Button type="button" onClick={showHistory} className="gap-2">
                <MaterialIcon name="history" className="text-base" /> Bildirimlerimi gör
              </Button>
            </div>
          </div>
        ) : activeTab === "history" ? (
          <ReportHistory history={history} onRetry={() => void loadHistory()} onSelect={setSelectedReport} />
        ) : (
          <NewReportForm
            screenshot={screenshot}
            previewUrl={previewUrl}
            state={state}
            onScreenshotChange={setScreenshot}
            onSubmit={submit}
            onCancel={close}
          />
        )}
      </Modal>
    </>
  );
}

function ReportHistory({
  history,
  onRetry,
  onSelect,
}: {
  history: HistoryState;
  onRetry: () => void;
  onSelect: (report: MyBugReport) => void;
}) {
  if (history.kind === "idle" || history.kind === "loading") {
    return (
      <div className="flex min-h-44 items-center justify-center gap-2 text-sm text-on-surface-variant" role="status">
        <MaterialIcon name="progress_activity" className="animate-spin text-xl" /> Bildirimleriniz yükleniyor…
      </div>
    );
  }

  if (history.kind === "error") {
    return (
      <div>
        <StatusMessage variant="error">{history.message}</StatusMessage>
        <Button type="button" variant="secondary" onClick={onRetry} className="mt-3 gap-2">
          <MaterialIcon name="refresh" className="text-base" /> Yeniden dene
        </Button>
      </div>
    );
  }

  if (history.reports.length === 0) {
    return (
      <div className="py-10 text-center">
        <MaterialIcon name="inbox" className="text-4xl text-outline" />
        <p className="mt-3 text-sm font-semibold text-on-surface">Henüz bir hata bildiriminiz yok</p>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-on-surface-variant">
          Yeni bildirim sekmesinden karşılaştığınız sorunu bize iletebilirsiniz.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      {history.reports.map((report) => {
        const meta = statusMeta[report.status];
        const latestResponse = report.responses.at(-1);
        return (
          <button
            key={report.id}
            type="button"
            onClick={() => onSelect(report)}
            className="flex w-full items-start justify-between gap-4 border-b border-outline-variant px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:px-5"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-on-surface">{report.subject}</span>
              <span className="mt-1 block text-xs text-on-surface-variant">
                {formatDate(report.createdAt)}
                {latestResponse ? ` · ${report.responses.length} yetkili yanıtı` : " · Henüz yanıt yok"}
              </span>
              {latestResponse && (
                <span className="mt-2 block truncate text-sm text-on-surface-variant">{latestResponse.message}</span>
              )}
            </span>
            <Badge variant={meta.variant} className="shrink-0 gap-1">
              <MaterialIcon name={meta.icon} className="text-sm" /> {meta.label}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}

function ReportDetail({ report, onBack }: { report: MyBugReport; onBack: () => void }) {
  const meta = statusMeta[report.status];
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <MaterialIcon name="arrow_back" className="text-lg" /> Bildirimlerime dön
      </button>

      <div className="flex items-start gap-3 rounded-xl bg-surface-container-low p-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-on-surface">
          <MaterialIcon name={meta.icon} />
        </span>
        <div className="min-w-0">
          <Badge variant={meta.variant}>{meta.label}</Badge>
          <p className="mt-1 text-sm text-on-surface-variant">{meta.description}</p>
          {report.resolvedAt && <p className="mt-1 text-xs text-on-surface-variant">Çözülme: {formatDate(report.resolvedAt)}</p>}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-on-surface">Gönderdiğiniz açıklama</h3>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-on-surface-variant">{report.description}</p>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-on-surface">Ekran görüntüsü</h3>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/bug-reports/${report.id}/screenshot`}
          alt={`${report.subject} hata bildirimi ekran görüntüsü`}
          className="mt-2 max-h-72 w-full rounded-xl border border-outline-variant bg-surface-container-low object-contain"
        />
      </div>

      <div className="mt-7 border-t border-outline-variant pt-6">
        <h3 className="text-sm font-semibold text-on-surface">Yetkili yanıtları</h3>
        {report.responses.length === 0 ? (
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">Henüz bir yanıt bırakılmadı. Güncellemeler burada görünecek.</p>
        ) : (
          <ol className="mt-3 space-y-4">
            {report.responses.map((response) => (
              <li key={response.id} className="border-b border-outline-variant pb-4 last:border-b-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-on-surface">
                    {response.author.name?.trim() || (response.author.role === "ADMIN" ? "Yönetici" : "Öğretmen")}
                  </span>
                  <span className="text-xs text-on-surface-variant">{formatDate(response.createdAt)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-on-surface-variant">{response.message}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function NewReportForm({
  screenshot,
  previewUrl,
  state,
  onScreenshotChange,
  onSubmit,
  onCancel,
}: {
  screenshot: File | null;
  previewUrl?: string;
  state: SubmitState;
  onScreenshotChange: (file: File | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Input
        name="subject"
        label="Hatanın konusu"
        required
        minLength={3}
        maxLength={120}
        placeholder="Örn. QR okutunca kamera yeniden açılıyor"
      />

      <Textarea
        name="description"
        label="Ne oldu?"
        required
        minLength={10}
        maxLength={3000}
        rows={5}
        placeholder="Hangi ekrandaydınız, ne yaptınız ve ne olmasını bekliyordunuz?"
        hint="Kişisel bilgi, parola veya erişim anahtarı paylaşmayın. Açıklama ve ekran görüntüsü yalnızca yetkili yönetici ve öğretmenler tarafından incelenir."
      />

      <div>
        <label className="block font-label-sm text-label-sm text-on-surface" htmlFor="bug-screenshot">
          Ekran görüntüsü
        </label>
        <label
          htmlFor="bug-screenshot"
          className="mt-1.5 flex min-h-28 cursor-pointer items-center gap-4 rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-4 transition-colors hover:border-primary/50 hover:bg-surface-container"
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Seçilen ekran görüntüsü önizlemesi" className="size-20 rounded-lg object-cover" />
          ) : (
            <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-surface-container text-on-surface-variant">
              <MaterialIcon name="add_photo_alternate" className="text-2xl" />
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-on-surface">
              {screenshot ? screenshot.name : "Ekran görüntüsü seçin"}
            </span>
            <span className="mt-1 block text-xs text-on-surface-variant">PNG, JPEG veya WebP · En fazla 6 MB</span>
          </span>
        </label>
        <input
          id="bug-screenshot"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          required
          className="sr-only"
          onChange={(event) => onScreenshotChange(event.target.files?.[0] ?? null)}
        />
      </div>

      {state.kind === "error" && <StatusMessage variant="error">{state.message}</StatusMessage>}

      <div className="flex flex-col-reverse gap-2 border-t border-outline-variant pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={state.kind === "submitting"}>Vazgeç</Button>
        <Button type="submit" disabled={state.kind === "submitting"} className="gap-2">
          <MaterialIcon name="send" className="text-base" />
          {state.kind === "submitting" ? "Gönderiliyor…" : "Bildirimi gönder"}
        </Button>
      </div>
    </form>
  );
}
