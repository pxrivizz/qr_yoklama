"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { MaterialIcon } from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableHead, TableRow, Th, Td } from "@/components/ui/table";
import type { QrScanActionType, QrScanResult } from "@/generated/prisma/client";

export type LogItem = {
  id: string;
  courseId: string | null;
  sessionId: string | null;
  enrollmentId: string | null;
  userId: string | null;
  studentName: string | null;
  studentNumber: string | null;
  className: string | null;
  actionType: QrScanActionType;
  scannedBy: string | null;
  scanSource: string | null;
  deviceInfo: string | null;
  ipAddress: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  distanceMeters: number | null;
  result: QrScanResult;
  resultMessage: string | null;
  userAgent: string | null;
  scannedAt: string | Date;
  course?: { id: string; name: string; code: string } | null;
  session?: { id: string; weekNumber: number; sessionIndexInWeek: number; status: string } | null;
  user?: { id: string; name: string | null; email: string; image: string | null; schoolNumber: string | null } | null;
};

type CourseOption = {
  id: string;
  name: string;
  code: string;
};

type QrLogsViewProps = {
  initialLogs: LogItem[];
  initialTotal: number;
  initialStats: {
    totalScans: number;
    successCount: number;
    duplicateCount: number;
    failedCount: number;
  };
  courses: CourseOption[];
};

function formatDateTime(dateVal: string | Date) {
  const d = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}

function formatRelativeTime(dateVal: string | Date) {
  const d = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
  const now = Date.now();
  const diffSec = Math.floor((now - d.getTime()) / 1000);

  if (diffSec < 60) return "Az önce";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} dk önce`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} sa önce`;
  return `${Math.floor(diffSec / 86400)} gün önce`;
}

/** Returns false on SSR and during first client render — prevents Date.now() hydration mismatch */
function useMounted() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

function getResultBadge(result: QrScanResult) {
  switch (result) {
    case "SUCCESS":
      return { variant: "success" as const, label: "Başarılı", icon: "check_circle" };
    case "DUPLICATE_SCAN":
      return { variant: "warning" as const, label: "Tekrar Okutma", icon: "replay" };
    case "OUT_OF_RADIUS":
      return { variant: "error" as const, label: "Konum Dışı", icon: "location_off" };
    case "OUT_OF_NETWORK":
      return { variant: "error" as const, label: "Ağ Dışı", icon: "wifi_off" };
    case "EXPIRED_QR":
      return { variant: "error" as const, label: "Süresi Dolmuş", icon: "timer_off" };
    case "INVALID_QR":
      return { variant: "error" as const, label: "Geçersiz QR", icon: "qr_code_2" };
    case "NOT_ENROLLED":
      return { variant: "error" as const, label: "Kayıtsız Öğrenci", icon: "person_off" };
    case "PHOTO_REQUIRED":
      return { variant: "warning" as const, label: "Fotoğraf Eksik", icon: "no_photography" };
    default:
      return { variant: "critical" as const, label: "Hata", icon: "error" };
  }
}

function getActionTypeBadge(actionType: QrScanActionType) {
  switch (actionType) {
    case "GIRIS":
      return { label: "Giriş", variant: "info" as const };
    case "CIKIS":
      return { label: "Çıkış", variant: "default" as const };
    case "YOKLAMA":
    default:
      return { label: "Yoklama", variant: "code" as const };
  }
}

export function QrLogsView({
  initialLogs,
  initialTotal,
  initialStats,
  courses,
}: QrLogsViewProps) {
  const [logs, setLogs] = useState<LogItem[]>(initialLogs);
  const [total, setTotal] = useState(initialTotal);
  const [stats, setStats] = useState(initialStats);
  const [isPending, startTransition] = useTransition();
  const mounted = useMounted();

  // Filters
  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState("");
  const [actionType, setActionType] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Selected Log for Modal
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);

  const totalPages = Math.ceil(total / pageSize) || 1;

  // Refs to always have the latest filter values inside the fetch closure
  const searchRef = useRef(search);
  const courseIdRef = useRef(courseId);
  const actionTypeRef = useRef(actionType);
  const resultRef = useRef(result);
  const startDateRef = useRef(startDate);
  const endDateRef = useRef(endDate);
  const pageSizeRef = useRef(pageSize);

  useEffect(() => { searchRef.current = search; }, [search]);
  useEffect(() => { courseIdRef.current = courseId; }, [courseId]);
  useEffect(() => { actionTypeRef.current = actionType; }, [actionType]);
  useEffect(() => { resultRef.current = result; }, [result]);
  useEffect(() => { startDateRef.current = startDate; }, [startDate]);
  useEffect(() => { endDateRef.current = endDate; }, [endDate]);
  useEffect(() => { pageSizeRef.current = pageSize; }, [pageSize]);

  const fetchLogs = useCallback(
    (targetPage: number) => {
      startTransition(async () => {
        try {
          const params = new URLSearchParams();
          params.set("page", targetPage.toString());
          params.set("pageSize", pageSizeRef.current.toString());
          const s = searchRef.current.trim();
          if (s) params.set("search", s);
          if (courseIdRef.current) params.set("courseId", courseIdRef.current);
          if (actionTypeRef.current) params.set("actionType", actionTypeRef.current);
          if (resultRef.current) params.set("result", resultRef.current);
          if (startDateRef.current) params.set("startDate", startDateRef.current);
          if (endDateRef.current) params.set("endDate", endDateRef.current);

          const res = await fetch(`/api/attendance/logs?${params.toString()}`);
          if (!res.ok) throw new Error("Loglar yüklenemedi");
          const json = (await res.json()) as {
            data?: {
              logs: LogItem[];
              pagination: { total: number };
              stats: { totalScans: number; successCount: number; duplicateCount: number; failedCount: number };
            };
          };
          if (json.data) {
            setLogs(json.data.logs);
            setTotal(json.data.pagination.total);
            setStats(json.data.stats);
            setPage(targetPage);
          }
        } catch (err) {
          console.error("Log getirme hatası:", err);
        }
      });
    },
    [],
  );

  // Re-fetch when filters or pageSize change — always reset to page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, courseId, actionType, result, startDate, endDate, pageSize, fetchLogs]);

  // Re-fetch when page changes (triggered by pagination buttons)
  const prevPageRef = useRef(page);
  useEffect(() => {
    if (prevPageRef.current !== page) {
      prevPageRef.current = page;
      fetchLogs(page);
    }
  }, [page, fetchLogs]);

  function handlePrevPage() {
    if (page > 1 && !isPending) setPage((p) => p - 1);
  }

  function handleNextPage() {
    if (page < totalPages && !isPending) setPage((p) => p + 1);
  }

  function handleResetFilters() {
    setSearch("");
    setCourseId("");
    setActionType("");
    setResult("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  }

  const hasActiveFilters =
    Boolean(search) ||
    Boolean(courseId) ||
    Boolean(actionType) ||
    Boolean(result) ||
    Boolean(startDate) ||
    Boolean(endDate);

  return (
    <div className="space-y-6">
      {/* İstatistikler */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-neutral-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Toplam Okutma</span>
            <span className="grid size-8 place-items-center rounded-lg bg-neutral-100 text-neutral-600">
              <MaterialIcon name="qr_code_scanner" className="text-base" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-neutral-900 tabular-nums">
            {stats.totalScans}
          </p>
          <span className="mt-0.5 block text-[11px] text-neutral-400">Tüm oturumlar genelinde</span>
        </div>

        <div className="rounded-xl border border-neutral-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700">Başarılı Okutma</span>
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
              <MaterialIcon name="check_circle" className="text-base" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-700 tabular-nums">
            {stats.successCount}
          </p>
          <span className="mt-0.5 block text-[11px] text-neutral-400">
            %{stats.totalScans > 0 ? Math.round((stats.successCount / stats.totalScans) * 100) : 0} başarı oranı
          </span>
        </div>

        <div className="rounded-xl border border-neutral-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700">Tekrar Okutma</span>
            <span className="grid size-8 place-items-center rounded-lg bg-amber-50 text-amber-600">
              <MaterialIcon name="replay" className="text-base" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-amber-700 tabular-nums">
            {stats.duplicateCount}
          </p>
          <span className="mt-0.5 block text-[11px] text-neutral-400">Tekrar denemeler</span>
        </div>

        <div className="rounded-xl border border-neutral-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-red-700">Hatalı / Engellenen</span>
            <span className="grid size-8 place-items-center rounded-lg bg-red-50 text-red-600">
              <MaterialIcon name="block" className="text-base" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-red-700 tabular-nums">
            {stats.failedCount}
          </p>
          <span className="mt-0.5 block text-[11px] text-neutral-400">Konum, ağ veya süre ihlali</span>
        </div>
      </div>

      {/* Filtre ve Arama Alanı */}
      <div className="rounded-xl border border-neutral-200/80 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Hızlı Arama */}
          <div className="relative flex-1">
            <MaterialIcon
              name="search"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-lg pointer-events-none"
            />
            <input
              type="text"
              placeholder="Öğrenci adı, soyadı veya öğrenci numarası ile hızlı ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 py-2.5 pl-10 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:border-neutral-900 focus:bg-white focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <MaterialIcon name="close" className="text-base" />
              </button>
            )}
          </div>

          {/* Sınıf / Ders Seçici */}
          <div className="flex items-center gap-2">
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-xs font-medium text-neutral-800 transition-colors focus:border-neutral-900 focus:bg-white focus:outline-none"
            >
              <option value="">Tüm Dersler / Sınıflar</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.name}
                </option>
              ))}
            </select>

            {/* İşlem Türü */}
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 py-2.5 text-xs font-medium text-neutral-800 transition-colors focus:border-neutral-900 focus:bg-white focus:outline-none"
            >
              <option value="">İşlem Türü: Tümü</option>
              <option value="YOKLAMA">Yoklama</option>
              <option value="GIRIS">Giriş</option>
              <option value="CIKIS">Çıkış</option>
            </select>

            {/* Sonuç Durumu */}
            <select
              value={result}
              onChange={(e) => setResult(e.target.value)}
              className="rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 py-2.5 text-xs font-medium text-neutral-800 transition-colors focus:border-neutral-900 focus:bg-white focus:outline-none"
            >
              <option value="">Sonuç: Tümü</option>
              <option value="SUCCESS">Başarılı</option>
              <option value="DUPLICATE_SCAN">Tekrar Okutma</option>
              <option value="OUT_OF_RADIUS">Konum Dışı</option>
              <option value="OUT_OF_NETWORK">Ağ Dışı</option>
              <option value="EXPIRED_QR">Süresi Dolmuş</option>
              <option value="INVALID_QR">Geçersiz QR</option>
              <option value="NOT_ENROLLED">Kayıtsız Öğrenci</option>
              <option value="PHOTO_REQUIRED">Fotoğraf Eksik</option>
            </select>
          </div>
        </div>

        {/* Tarih Aralığı ve Temizleme */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600">
            <span className="font-medium text-neutral-500">Tarih Aralığı:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-800 focus:border-neutral-900 focus:outline-none"
              title="Başlangıç Tarihi"
            />
            <span className="text-neutral-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-800 focus:border-neutral-900 focus:outline-none"
              title="Bitiş Tarihi"
            />
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-100 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200 transition-colors"
              >
                <MaterialIcon name="filter_alt_off" className="text-sm" />
                Filtreleri Temizle
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500">
            {isPending && (
              <span className="inline-flex items-center gap-1.5 text-neutral-500 animate-pulse">
                <MaterialIcon name="sync" className="text-sm animate-spin" />
                Yenileniyor...
              </span>
            )}
            <span className="font-medium text-neutral-700 tabular-nums">
              Toplam {total} kayıt
            </span>
          </div>
        </div>
      </div>

      {/* Masaüstü Tablo Görünümü */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-neutral-200/80 bg-white shadow-sm">
        <Table>
          <TableHead>
            <Th>Öğrenci</Th>
            <Th>Sınıf / Ders</Th>
            <Th>Tarih & Saat</Th>
            <Th>İşlem Türü</Th>
            <Th>Okutma Kaynağı</Th>
            <Th>Konum / Ağ</Th>
            <Th>İşlem Sonucu</Th>
            <Th className="text-right">Detay</Th>
          </TableHead>
          <TableBody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-neutral-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <MaterialIcon name="search_off" className="text-3xl text-neutral-400" />
                    <p className="font-medium text-neutral-700">Kayıt bulunamadı</p>
                    <p className="text-xs text-neutral-400">
                      {hasActiveFilters
                        ? "Uyguladığınız filtre kriterlerine uygun QR okutma kaydı yok."
                        : "Henüz sisteme kaydedilmiş bir QR okutma işlemi bulunmuyor."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((item) => {
                const resBadge = getResultBadge(item.result);
                const actBadge = getActionTypeBadge(item.actionType);

                return (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-neutral-50/70 transition-colors"
                    onClick={() => setSelectedLog(item)}
                  >
                    {/* Öğrenci */}
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <div className="grid size-8 shrink-0 place-items-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-700 border border-neutral-200">
                          {item.studentName
                            ? item.studentName.slice(0, 2).toLocaleUpperCase("tr-TR")
                            : "ÖG"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-neutral-900">
                            {item.studentName ?? "Bilinmeyen Öğrenci"}
                          </p>
                          <span className="font-mono text-[11px] text-neutral-400">
                            {item.studentNumber ? `No: ${item.studentNumber}` : "-"}
                          </span>
                        </div>
                      </div>
                    </Td>

                    {/* Sınıf / Ders */}
                    <Td>
                      <div className="min-w-0">
                        {item.course ? (
                          <span className="inline-flex items-center gap-1 rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-neutral-700">
                            {item.course.code}
                          </span>
                        ) : (
                          <span className="text-[11px] text-neutral-400 font-mono">
                            {item.className ?? "-"}
                          </span>
                        )}
                        <p className="mt-0.5 truncate text-[11px] text-neutral-600 max-w-[140px]">
                          {item.course?.name ?? ""}
                        </p>
                      </div>
                    </Td>

                    {/* Tarih & Saat */}
                    <Td>
                      <div className="min-w-0">
                        <span className="block font-mono text-xs text-neutral-800" suppressHydrationWarning>
                          {formatDateTime(item.scannedAt)}
                        </span>
                        <span className="text-[11px] text-neutral-400" suppressHydrationWarning>
                          {mounted ? formatRelativeTime(item.scannedAt) : ""}
                        </span>
                      </div>
                    </Td>

                    {/* İşlem Türü */}
                    <Td>
                      <Badge variant={actBadge.variant}>{actBadge.label}</Badge>
                    </Td>

                    {/* Okutma Kaynağı */}
                    <Td>
                      <div className="min-w-0">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-700">
                          <MaterialIcon
                            name={item.scanSource?.includes("Telefon") ? "smartphone" : "photo_camera"}
                            className="text-sm text-neutral-400"
                          />
                          {item.scanSource ?? "Kamera"}
                        </span>
                        <p className="truncate text-[11px] text-neutral-400 max-w-[150px]" title={item.deviceInfo ?? ""}>
                          {item.deviceInfo ?? "Web Cihazı"}
                        </p>
                      </div>
                    </Td>

                    {/* Konum / IP */}
                    <Td>
                      <div className="min-w-0">
                        {item.location ? (
                          <span className="inline-flex items-center gap-1 text-xs text-neutral-700" title={item.location}>
                            <MaterialIcon name="location_on" className="text-sm text-emerald-600 shrink-0" />
                            <span className="truncate max-w-[130px]">{item.location}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                            <MaterialIcon name="lan" className="text-sm text-neutral-400" />
                            {item.ipAddress ?? "IP Kayıtsız"}
                          </span>
                        )}
                      </div>
                    </Td>

                    {/* İşlem Sonucu */}
                    <Td>
                      <Badge variant={resBadge.variant} className="inline-flex items-center gap-1">
                        <MaterialIcon name={resBadge.icon} className="text-xs" />
                        {resBadge.label}
                      </Badge>
                    </Td>

                    {/* İşlem Butonu */}
                    <Td className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="size-8 min-h-0 p-0 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(item);
                        }}
                        title="Tüm detayları incele"
                      >
                        <MaterialIcon name="visibility" className="text-base" />
                      </Button>
                    </Td>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobil Kart Görünümü */}
      <div className="block md:hidden space-y-3">
        {logs.length === 0 ? (
          <div className="rounded-xl border border-neutral-200/80 bg-white p-8 text-center text-sm text-neutral-500">
            <MaterialIcon name="search_off" className="text-3xl text-neutral-400 mx-auto" />
            <p className="mt-2 font-medium text-neutral-700">Kayıt bulunamadı</p>
            <p className="mt-1 text-xs text-neutral-400">Filtre kriterlerinizi değiştirip tekrar deneyin.</p>
          </div>
        ) : (
          logs.map((item) => {
            const resBadge = getResultBadge(item.result);
            const actBadge = getActionTypeBadge(item.actionType);

            return (
              <div
                key={item.id}
                onClick={() => setSelectedLog(item)}
                className="rounded-xl border border-neutral-200/80 bg-white p-4 shadow-sm space-y-2.5 active:bg-neutral-50 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-8 place-items-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-700 border border-neutral-200">
                      {item.studentName ? item.studentName.slice(0, 2).toLocaleUpperCase("tr-TR") : "ÖG"}
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-neutral-900">{item.studentName ?? "Bilinmeyen Öğrenci"}</h3>
                      <span className="font-mono text-[11px] text-neutral-400">
                        {item.studentNumber ? `No: ${item.studentNumber}` : "-"}
                      </span>
                    </div>
                  </div>
                  <Badge variant={resBadge.variant} className="inline-flex items-center gap-1 text-[10px]">
                    <MaterialIcon name={resBadge.icon} className="text-xs" />
                    {resBadge.label}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center justify-between text-xs text-neutral-600 gap-1 border-t border-neutral-100 pt-2">
                  <div className="flex items-center gap-1.5">
                    <Badge variant={actBadge.variant}>{actBadge.label}</Badge>
                    <span className="font-mono text-[11px] text-neutral-600">
                      {item.course?.code ?? item.className ?? "Ders"}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-neutral-400">
                    {formatDateTime(item.scannedAt)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span className="truncate max-w-[200px]">{item.deviceInfo ?? item.scanSource}</span>
                  <span className="text-neutral-700 font-medium hover:underline inline-flex items-center gap-0.5">
                    Detay <MaterialIcon name="chevron_right" className="text-sm" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sayfalama (Pagination) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-neutral-200/80 pt-4">
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span>Sayfa başına kayıt:</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-800 focus:border-neutral-900 focus:outline-none"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-neutral-400">|</span>
          <span>
            {total === 0 ? "0" : (page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} / {total} kayıt
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={page <= 1 || isPending}
            onClick={handlePrevPage}
            className="border border-neutral-200 text-xs shadow-none px-3"
          >
            <MaterialIcon name="chevron_left" className="text-base mr-1" /> Önceki
          </Button>

          <span className="px-2 text-xs font-medium text-neutral-700">
            {page} / {totalPages}
          </span>

          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={page >= totalPages || isPending}
            onClick={handleNextPage}
            className="border border-neutral-200 text-xs shadow-none px-3"
          >
            Sonraki <MaterialIcon name="chevron_right" className="text-base ml-1" />
          </Button>
        </div>
      </div>

      {/* Güvenlik ve Silinemezlik Bildirimi */}
      <div className="rounded-xl border border-neutral-200/70 bg-neutral-50/60 p-4 flex items-start gap-3">
        <MaterialIcon name="verified_user" className="text-neutral-500 text-lg mt-0.5 shrink-0" />
        <div className="text-xs text-neutral-600">
          <p className="font-semibold text-neutral-800">Güvenlik ve Denetim Kaydı</p>
          <p className="mt-0.5">
            Öğrencilerin QR okutma denemeleri sistem tarafından otomatik mühürlenir. Yanlışlıkla veri kaybını önlemek ve yasal/kurumsal denetim standartlarına uyum sağlamak amacıyla log kayıtları öğretmenler tarafından silinemez veya değiştirilemez.
          </p>
        </div>
      </div>

      {/* Detay Modalı (Modal) */}
      <Modal
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="QR Okutma Log Detayı"
        description="Öğrencinin QR tarama anına ait teknik ve konumsal denetim bilgileri."
      >
        {selectedLog && (
          <div className="space-y-5 text-sm">
            {/* Durum Özeti Başlığı */}
            <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/80 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-white border border-neutral-200 text-lg">
                  <MaterialIcon
                    name={getResultBadge(selectedLog.result).icon}
                    className={
                      selectedLog.result === "SUCCESS"
                        ? "text-emerald-600"
                        : selectedLog.result === "DUPLICATE_SCAN"
                          ? "text-amber-600"
                          : "text-red-600"
                    }
                  />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-neutral-900">
                      {getResultBadge(selectedLog.result).label}
                    </h3>
                    <Badge variant={getActionTypeBadge(selectedLog.actionType).variant}>
                      {getActionTypeBadge(selectedLog.actionType).label}
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {selectedLog.resultMessage ?? "İşlem detay açıklaması bulunmuyor."}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="block font-mono text-xs font-semibold text-neutral-800" suppressHydrationWarning>
                  {formatDateTime(selectedLog.scannedAt)}
                </span>
                <span className="text-[11px] text-neutral-400" suppressHydrationWarning>
                  {mounted ? formatRelativeTime(selectedLog.scannedAt) : ""}
                </span>
              </div>
            </div>

            {/* Bölümler Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Öğrenci Bilgileri */}
              <div className="rounded-xl border border-neutral-200/80 bg-white p-4 space-y-2.5">
                <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
                  <MaterialIcon name="person" className="text-base text-neutral-500" />
                  <h4 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
                    Öğrenci Bilgileri
                  </h4>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Adı Soyadı:</span>
                    <strong className="text-neutral-900">{selectedLog.studentName ?? "-"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Öğrenci Numarası:</span>
                    <strong className="font-mono text-neutral-900">{selectedLog.studentNumber ?? "-"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Sistem E-postası:</span>
                    <span className="text-neutral-700">{selectedLog.user?.email ?? "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Okutmayı Yapan:</span>
                    <span className="text-neutral-700">{selectedLog.scannedBy ?? "-"}</span>
                  </div>
                </div>
              </div>

              {/* Ders ve Oturum Bilgileri */}
              <div className="rounded-xl border border-neutral-200/80 bg-white p-4 space-y-2.5">
                <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
                  <MaterialIcon name="school" className="text-base text-neutral-500" />
                  <h4 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
                    Ders & Sınıf Bilgileri
                  </h4>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Ders Kodu:</span>
                    <strong className="font-mono text-neutral-900">
                      {selectedLog.course?.code ?? selectedLog.className ?? "-"}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Ders Adı:</span>
                    <strong className="text-neutral-900">{selectedLog.course?.name ?? "-"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Oturum Bilgisi:</span>
                    <span className="text-neutral-700">
                      {selectedLog.session
                        ? `Hafta ${selectedLog.session.weekNumber} · Oturum ${selectedLog.session.sessionIndexInWeek}`
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Oturum Durumu:</span>
                    <span className="text-neutral-700">
                      {!selectedLog.session
                        ? "-"
                        : selectedLog.session.status === "ACTIVE"
                          ? "Aktif / Devam Ediyor"
                          : "Kapanmış"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Okutma Kaynağı ve Cihaz */}
              <div className="rounded-xl border border-neutral-200/80 bg-white p-4 space-y-2.5">
                <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
                  <MaterialIcon name="devices" className="text-base text-neutral-500" />
                  <h4 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
                    Kaynak & Cihaz Analizi
                  </h4>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Okutma Kaynağı:</span>
                    <span className="font-medium text-neutral-800">{selectedLog.scanSource ?? "Kamera"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Cihaz Türü & Tarayıcı:</span>
                    <span className="font-medium text-neutral-800">{selectedLog.deviceInfo ?? "-"}</span>
                  </div>
                  <div className="space-y-1 pt-1">
                    <span className="text-neutral-400 block text-[10px]">User-Agent:</span>
                    <p className="font-mono text-[10px] text-neutral-600 bg-neutral-50 p-2 rounded border border-neutral-200/60 break-all">
                      {selectedLog.userAgent ?? "Kayıtlı değil"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Konum ve Ağ Bilgisi */}
              <div className="rounded-xl border border-neutral-200/80 bg-white p-4 space-y-2.5">
                <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
                  <MaterialIcon name="pin_drop" className="text-base text-neutral-500" />
                  <h4 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
                    Konum & Ağ Bilgisi
                  </h4>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">IP Adresi:</span>
                    <strong className="font-mono text-neutral-800">{selectedLog.ipAddress ?? "Bilinmiyor"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Konum Özeti:</span>
                    <span className="text-neutral-800">{selectedLog.location ?? "Konum verisi yok"}</span>
                  </div>
                  {selectedLog.distanceMeters !== null && selectedLog.distanceMeters !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Okul Merkezine Mesafe:</span>
                      <strong className="text-neutral-800 tabular-nums">
                        {Math.round(selectedLog.distanceMeters)} metre
                      </strong>
                    </div>
                  )}
                  {selectedLog.accuracyMeters !== null && selectedLog.accuracyMeters !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">GPS Hassasiyeti:</span>
                      <span className="text-neutral-700 tabular-nums">
                        ±{Math.round(selectedLog.accuracyMeters)} metre
                      </span>
                    </div>
                  )}
                  {selectedLog.latitude !== null && selectedLog.longitude !== null && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">GPS Koordinatları:</span>
                      <span className="font-mono text-[11px] text-neutral-700">
                        {selectedLog.latitude?.toFixed(6)}, {selectedLog.longitude?.toFixed(6)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Alt Kısım Bilgilendirme ve Kapat Butonu */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-neutral-100 pt-4">
              <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                <MaterialIcon name="lock" className="text-sm" />
                <span>Kayıt ID: <span className="font-mono">{selectedLog.id}</span> (Silinemez Salt-Okunur Denetim Kaydı)</span>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSelectedLog(null)}
                className="w-full sm:w-auto"
              >
                Kapat
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
