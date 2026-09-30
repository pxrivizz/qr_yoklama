"use client";

import { FormEvent, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/icons";
import { Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { StatusMessage } from "@/components/ui/status-message";
import { cn } from "@/lib/cn";

type BugReportStatus = "PENDING" | "IN_PROGRESS" | "FIXED";
type ReportUser = { id: string; name: string | null; email: string; role: "ADMIN" | "TEACHER" | "STUDENT" };

export type BugReportItem = {
  id: string;
  subject: string;
  description: string;
  screenshotMimeType: string;
  pageUrl: string | null;
  userAgent: string | null;
  status: BugReportStatus;
  resolvedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  reporter: ReportUser;
  handledBy: ReportUser | null;
  responses: Array<{
    id: string;
    message: string;
    createdAt: string | Date;
    author: ReportUser;
  }>;
};

type Summary = Record<BugReportStatus, number>;
type Filter = "ALL" | BugReportStatus;

type Props = {
  initialReports: BugReportItem[];
  initialTotal: number;
  initialSummary: Summary;
};

const statusMeta: Record<BugReportStatus, {
  label: string;
  description: string;
  variant: "default" | "info" | "success";
  icon: string;
}> = {
  PENDING: { label: "Bekliyor", description: "Henüz işleme alınmadı", variant: "default", icon: "schedule" },
  IN_PROGRESS: { label: "İşlemde", description: "Bir yetkili ilgileniyor", variant: "info", icon: "construction" },
  FIXED: { label: "Çözüldü", description: "Düzeltme tamamlandı", variant: "success", icon: "check_circle" },
};

const filters: Array<{ value: Filter; label: string }> = [
  { value: "ALL", label: "Tümü" },
  { value: "PENDING", label: "Bekleyen" },
  { value: "IN_PROGRESS", label: "İşlemde" },
  { value: "FIXED", label: "Çözülen" },
];

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function displayName(user: ReportUser) {
  return user.name?.trim() || user.email;
}

export function BugReportsView({ initialReports, initialTotal, initialSummary }: Props) {
  const [reports, setReports] = useState(initialReports);
  const [total, setTotal] = useState(initialTotal);
  const [summary, setSummary] = useState(initialSummary);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [selected, setSelected] = useState<BugReportItem | null>(null);
  const [reply, setReply] = useState("");
  const [actionError, setActionError] = useState<string>();
  const [isRefreshing, startRefresh] = useTransition();
  const [isSaving, setIsSaving] = useState(false);

  function loadReports(nextFilter: Filter = filter) {
    setActionError(undefined);
    startRefresh(async () => {
      try {
        const query = nextFilter === "ALL" ? "" : `&status=${nextFilter}`;
        const response = await fetch(`/api/bug-reports?page=1&pageSize=20${query}`, { cache: "no-store" });
        const body = (await response.json()) as {
          data?: { reports: BugReportItem[]; pagination: { total: number }; summary: Summary };
          error?: { message?: string };
        };
        if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Kayıtlar yenilenemedi.");
        setReports(body.data.reports);
        setTotal(body.data.pagination.total);
        setSummary(body.data.summary);
        setSelected((current) =>
          current ? body.data?.reports.find((item) => item.id === current.id) ?? current : null,
        );
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Kayıtlar yenilenemedi.");
      }
    });
  }

  function chooseFilter(nextFilter: Filter) {
    setFilter(nextFilter);
    loadReports(nextFilter);
  }

  function applyReportUpdate(next: BugReportItem, previousStatus: BugReportStatus) {
    setSelected(next);
    setReports((current) => {
      if (filter !== "ALL" && next.status !== filter) return current.filter((item) => item.id !== next.id);
      return current.map((item) => (item.id === next.id ? next : item));
    });
    if (previousStatus !== next.status) {
      setSummary((current) => ({
        ...current,
        [previousStatus]: Math.max(0, current[previousStatus] - 1),
        [next.status]: current[next.status] + 1,
      }));
      if (filter !== "ALL" && previousStatus === filter) setTotal((current) => Math.max(0, current - 1));
    }
  }

  async function changeStatus(status: BugReportStatus) {
    if (!selected || selected.status === status) return;
    const previousStatus = selected.status;
    setActionError(undefined);
    setIsSaving(true);
    try {
      const response = await fetch(`/api/bug-reports/${selected.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = (await response.json()) as { data?: BugReportItem; error?: { message?: string } };
      if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Durum güncellenemedi.");
      applyReportUpdate(body.data, previousStatus);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Durum güncellenemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !reply.trim()) return;
    const previousStatus = selected.status;
    setActionError(undefined);
    setIsSaving(true);
    try {
      const response = await fetch(`/api/bug-reports/${selected.id}/responses`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: reply }),
      });
      const body = (await response.json()) as { data?: BugReportItem; error?: { message?: string } };
      if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Yanıt kaydedilemedi.");
      setReply("");
      applyReportUpdate(body.data, previousStatus);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Yanıt kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section aria-labelledby="bug-reports-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="bug-reports-heading" className="text-lg font-bold text-neutral-900">
            Hata bildirimleri
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-600">
            Kullanıcı bildirimlerini inceleyin, yanıtlayın ve çözüm durumunu manuel olarak yönetin.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => loadReports()} disabled={isRefreshing} className="gap-2 self-start sm:self-auto">
          <MaterialIcon name="refresh" className={isRefreshing ? "animate-spin" : undefined} />
          Yenile
        </Button>
      </div>

      <div className="mt-5 grid overflow-hidden rounded-xl border border-neutral-200 bg-white sm:grid-cols-3">
        {(["PENDING", "IN_PROGRESS", "FIXED"] as const).map((status, index) => {
          const meta = statusMeta[status];
          return (
            <button
              key={status}
              type="button"
              onClick={() => chooseFilter(status)}
              className={cn(
                "flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-900",
                index > 0 && "border-t border-neutral-200 sm:border-l sm:border-t-0",
                filter === status && "bg-neutral-50",
              )}
            >
              <span>
                <span className="block text-sm font-semibold text-neutral-900">{meta.label}</span>
                <span className="mt-0.5 block text-xs text-neutral-500">{meta.description}</span>
              </span>
              <span className="tabular-nums text-2xl font-bold text-neutral-900">{summary[status]}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Hata bildirimi filtreleri">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => chooseFilter(item.value)}
            aria-pressed={filter === item.value}
            className={cn(
              "min-h-10 shrink-0 rounded-lg border px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2",
              filter === item.value
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {actionError && !selected && <StatusMessage variant="error" className="mt-4">{actionError}</StatusMessage>}

      <div className={cn("mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-white", isRefreshing && "opacity-60")} aria-busy={isRefreshing}>
        {reports.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <MaterialIcon name={filter === "FIXED" ? "task_alt" : "bug_report"} className="text-4xl text-neutral-300" />
            <p className="mt-3 text-sm font-semibold text-neutral-800">
              {filter === "ALL" ? "Henüz hata bildirimi yok" : "Bu durumda kayıt yok"}
            </p>
            <p className="mt-1 text-xs text-neutral-500">Filtreyi değiştirerek diğer bildirimleri görebilirsiniz.</p>
          </div>
        ) : (
          reports.map((report) => {
            const meta = statusMeta[report.status];
            return (
              <button
                key={report.id}
                type="button"
                onClick={() => {
                  setActionError(undefined);
                  setReply("");
                  setSelected(report);
                }}
                className="flex w-full items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-900"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-neutral-900">{report.subject}</span>
                  <span className="mt-1 block truncate text-xs text-neutral-500">
                    {displayName(report.reporter)} · {formatDate(report.createdAt)}
                    {report.responses.length > 0 ? ` · ${report.responses.length} yanıt` : ""}
                  </span>
                </span>
                <Badge variant={meta.variant} className="shrink-0 gap-1">
                  <MaterialIcon name={meta.icon} className="text-sm" /> {meta.label}
                </Badge>
              </button>
            );
          })
        )}
      </div>
      <p className="mt-2 text-right text-xs text-neutral-500">{total} kayıt gösteriliyor</p>

      {selected && (
        <Modal
          open
          onClose={() => setSelected(null)}
          title={selected.subject}
          description={`${displayName(selected.reporter)} · ${formatDate(selected.createdAt)}`}
          className="max-w-4xl"
        >
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Durum</h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {(["PENDING", "IN_PROGRESS", "FIXED"] as const).map((status) => {
                  const meta = statusMeta[status];
                  const active = selected.status === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => void changeStatus(status)}
                      disabled={isSaving}
                      aria-pressed={active}
                      className={cn(
                        "flex min-h-12 items-center gap-2 rounded-lg border px-3 text-left text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
                        active ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
                      )}
                    >
                      <MaterialIcon name={meta.icon} className="text-lg" />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
              {selected.handledBy && (
                <p className="mt-2 text-xs text-neutral-500">Son işlem: {displayName(selected.handledBy)}</p>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
              <div className="min-w-0 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">Kullanıcının açıklaması</h3>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-700">{selected.description}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">Ekran görüntüsü</h3>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/bug-reports/${selected.id}/screenshot`}
                    alt={`${selected.subject} hata bildirimi ekran görüntüsü`}
                    className="mt-2 max-h-[32rem] w-full rounded-xl border border-neutral-200 bg-neutral-50 object-contain"
                  />
                </div>
              </div>

              <div className="min-w-0 lg:border-l lg:border-neutral-200 lg:pl-6">
                <h3 className="text-sm font-semibold text-neutral-900">Yetkili yanıtları</h3>
                {selected.responses.length === 0 ? (
                  <p className="mt-2 rounded-lg bg-neutral-50 px-3 py-4 text-sm leading-6 text-neutral-500">Henüz yanıt eklenmedi.</p>
                ) : (
                  <ol className="mt-3 space-y-4">
                    {selected.responses.map((response) => (
                      <li key={response.id} className="border-b border-neutral-200 pb-4 last:border-b-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-neutral-900">{displayName(response.author)}</span>
                          <span className="text-xs text-neutral-500">{formatDate(response.createdAt)}</span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-700">{response.message}</p>
                      </li>
                    ))}
                  </ol>
                )}

                <form onSubmit={submitReply} className="mt-5 border-t border-neutral-200 pt-5">
                  <Textarea
                    id="bug-report-reply"
                    label="Yeni yanıt"
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    minLength={2}
                    maxLength={3000}
                    rows={4}
                    required
                    disabled={isSaving}
                    placeholder="Yapılan incelemeyi veya çözümü yazın…"
                    hint="İlk yanıt, bekleyen kaydı otomatik olarak İşlemde durumuna taşır."
                  />
                  <Button type="submit" className="mt-3 w-full gap-2" disabled={isSaving || reply.trim().length < 2}>
                    <MaterialIcon name="send" className="text-base" />
                    {isSaving ? "Kaydediliyor…" : "Yanıtı kaydet"}
                  </Button>
                </form>
              </div>
            </div>

            {actionError && <StatusMessage variant="error">{actionError}</StatusMessage>}
          </div>
        </Modal>
      )}
    </section>
  );
}
