"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";

export type NotificationData = {
  id: string;
  courseId: string | null;
  sessionId: string | null;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string | Date;
  course?: {
    id: string;
    name: string;
    code: string;
  } | null;
};

type StudentNotificationsProps = {
  initialUnreadCount?: number;
};

function formatRelativeTime(dateVal: string | Date) {
  const d = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
  if (isNaN(d.getTime())) return "";
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);

  if (diffSec < 60) return "Az önce";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} dk önce`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} sa önce`;
  return `${Math.floor(diffSec / 86400)} gün önce`;
}

export function StudentNotifications({ initialUnreadCount = 0 }: StudentNotificationsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isLoading, setIsLoading] = useState(false);
  const [attendancePopup, setAttendancePopup] = useState<NotificationData>();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const popupSeenRef = useRef(new Set<string>());

  async function fetchNotifications() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/student/notifications?limit=15");
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          const nextNotifications = json.data.notifications as NotificationData[];
          setNotifications(nextNotifications);
          setUnreadCount(json.data.unreadCount);

          const latestAttendance = nextNotifications.find((item) =>
            item.type === "ATTENDANCE_STARTED" && !item.isRead && item.courseId,
          );
          if (latestAttendance && !popupSeenRef.current.has(latestAttendance.id)) {
            popupSeenRef.current.add(latestAttendance.id);
            const storageKey = `attendance-popup:${latestAttendance.id}`;
            let alreadyShown = false;
            try {
              alreadyShown = window.sessionStorage.getItem(storageKey) === "shown";
              if (!alreadyShown) window.sessionStorage.setItem(storageKey, "shown");
            } catch {
              // Bellek erişimi kapalıysa aynı sayfa oturumundaki ref koruması yeterlidir.
            }
            if (!alreadyShown) setAttendancePopup(latestAttendance);
          }
        }
      }
    } catch (err) {
      console.error("Bildirimler yüklenemedi:", err);
    } finally {
      setIsLoading(false);
    }
  }

  // Poll notifications every 15 seconds to catch active attendance notifications
  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      void fetchNotifications();
    }, 0);
    const pollTimer = window.setInterval(() => {
      void fetchNotifications();
    }, 15000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(pollTimer);
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  function handleToggle() {
    if (!isOpen) {
      void fetchNotifications();
    }
    setIsOpen((prev) => !prev);
  }

  async function handleMarkAllAsRead() {
    startTransition(async () => {
      try {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        await fetch("/api/student/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ all: true }),
        });
      } catch (err) {
        console.error("Bildirimler okundu işaretlenemedi:", err);
      }
    });
  }

  async function handleNotificationClick(id: string) {
    try {
      const target = notifications.find((n) => n.id === id);
      if (target && !target.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setIsOpen(false);
      setAttendancePopup((current) => current?.id === id ? undefined : current);
        await fetch("/api/student/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
          keepalive: true,
        });
    } catch {
      // Ignore
    }
  }

  function closeAttendancePopup() {
    if (!attendancePopup) return;
    const notificationId = attendancePopup.id;
    setAttendancePopup(undefined);
    void handleNotificationClick(notificationId);
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative grid size-9 place-items-center rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
        title="Bildirimler"
        aria-label="Bildirimler"
      >
        <MaterialIcon name="notifications" className="text-xl" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 grid min-w-5 h-5 place-items-center rounded-full bg-red-600 px-1 font-mono text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-x-4 top-16 z-[100] rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl animate-fade-in-up sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-96">
          <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-neutral-900">Bildirimler</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                  {unreadCount} yeni
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                Tümünü Okundu Say
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100">
            {isLoading && notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                <MaterialIcon name="sync" className="text-lg animate-spin mx-auto text-neutral-400" />
                <p className="mt-1">Bildirimler yükleniyor...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                <MaterialIcon name="notifications_off" className="text-2xl mx-auto text-neutral-300" />
                <p className="mt-1">Henüz bildiriminiz yok.</p>
              </div>
            ) : (
              notifications.map((item) => {
                const isAttendance = item.type === "ATTENDANCE_STARTED";
                const content = (
                  <div
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer",
                      item.isRead ? "hover:bg-neutral-50" : "bg-blue-50/50 hover:bg-blue-50/80",
                    )}
                    onClick={() => void handleNotificationClick(item.id)}
                  >
                    <div
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-lg text-sm",
                        isAttendance ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-700",
                      )}
                    >
                      <MaterialIcon
                        name={isAttendance ? "qr_code_scanner" : "info"}
                        className="text-base"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="truncate text-xs font-semibold text-neutral-900">
                          {item.title}
                        </h4>
                        {!item.isRead && (
                          <span className="size-2 shrink-0 rounded-full bg-blue-600" />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-neutral-600 line-clamp-2">
                        {item.message}
                      </p>
                      <span className="mt-1 block text-[10px] text-neutral-400 font-medium" suppressHydrationWarning>
                        {mounted ? formatRelativeTime(item.createdAt) : ""}
                      </span>
                    </div>
                  </div>
                );

                if (item.courseId) {
                  return (
                    <Link
                      key={item.id}
                      href={`/ogrenci/ders/${item.courseId}`}
                      className="block"
                    >
                      {content}
                    </Link>
                  );
                }

                return <div key={item.id}>{content}</div>;
              })
            )}
          </div>
        </div>
      )}
      </div>

      <Modal
        open={Boolean(attendancePopup)}
        onClose={closeAttendancePopup}
        title="Yoklama başladı"
        description={attendancePopup?.course
          ? `${attendancePopup.course.code} · ${attendancePopup.course.name}`
          : attendancePopup?.title}
        className="max-w-md"
      >
        <div className="grid gap-5">
          <div className="flex items-start gap-3 rounded-xl border border-secondary/25 bg-secondary-container/45 p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-on-secondary">
              <MaterialIcon name="notifications_active" />
            </span>
            <div>
              <p className="font-label-lg text-label-lg text-on-surface">
                QR kodunu okutmaya hazırlanın
              </p>
              <p className="mt-1 font-body-md text-body-md leading-6 text-on-surface-variant">
                Önce <strong>eduroam veya okul Wi-Fi ağına</strong> bağlı olduğunuzu kontrol edin.
                Ardından ders sayfasından yoklamaya katılın.
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={closeAttendancePopup}>
              Kapat
            </Button>
            {attendancePopup?.courseId && (
              <Link
                href={`/ogrenci/ders/${attendancePopup.courseId}`}
                onClick={() => void handleNotificationClick(attendancePopup.id)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 font-label-sm text-label-sm text-white transition-colors hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
              >
                <MaterialIcon name="qr_code_scanner" />
                Yoklamaya Git
              </Link>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
