"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { MaterialIcon } from "@/components/ui/icons";
import { COOKIE_NOTICE_STORAGE_KEY } from "@/lib/legal/documents";

const COOKIE_NOTICE_EXIT_MS = 160;

export function CookieNotice() {
  const [isLeaving, setIsLeaving] = useState(false);
  const visible = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      window.addEventListener("dersdevam:cookie-notice", onStoreChange);
      return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener("dersdevam:cookie-notice", onStoreChange);
      };
    },
    () => window.localStorage.getItem(COOKIE_NOTICE_STORAGE_KEY) !== "acknowledged",
    () => false,
  );

  function acknowledge() {
    if (isLeaving) return;

    setIsLeaving(true);
    window.setTimeout(() => {
      window.localStorage.setItem(COOKIE_NOTICE_STORAGE_KEY, "acknowledged");
      window.dispatchEvent(new Event("dersdevam:cookie-notice"));
    }, COOKIE_NOTICE_EXIT_MS);
  }

  if (!visible) return null;

  return (
    <aside
      className="cookie-notice fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-3xl overflow-hidden rounded-xl bg-neutral-950 text-white shadow-[0_14px_44px_rgba(0,0,0,0.24)] sm:inset-x-6 sm:bottom-5"
      data-leaving={isLeaving}
      aria-labelledby="cookie-notice-title"
      aria-describedby="cookie-notice-description"
    >
      <div className="grid grid-cols-[auto_1fr] items-start gap-x-3 gap-y-3 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-4 sm:px-5 sm:py-4">
        <span className="cookie-notice__icon grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-300 text-emerald-950">
          <MaterialIcon name="shield_lock" className="text-[19px]" />
        </span>

        <div>
          <h2 id="cookie-notice-title" className="text-[13px] font-semibold">
            Yalnızca zorunlu çerezler kullanıyoruz
          </h2>
          <p id="cookie-notice-description" className="mt-0.5 max-w-xl text-[11px] leading-[1.55] text-neutral-300">
            Oturumunuzu güvenli tutmak, yoklama cihazını doğrulamak ve tercihlerinizi hatırlamak için gerekli teknik kayıtları kullanıyoruz. Analiz, reklam veya pazarlama çerezi kullanmıyoruz.
          </p>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium">
            <Link className="text-emerald-300 underline decoration-emerald-300/50 underline-offset-4 hover:text-emerald-200" href="/cerez-politikasi">
              Çerez politikasını incele
            </Link>
            <Link className="text-neutral-300 underline decoration-neutral-500 underline-offset-4 hover:text-white" href="/kvkk">
              KVKK aydınlatması
            </Link>
          </div>
        </div>

        <button
          type="button"
          onClick={acknowledge}
          disabled={isLeaving}
          className="cookie-notice__button col-span-2 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-white px-4 text-[13px] font-semibold text-neutral-950 hover:bg-neutral-100 sm:col-span-1 sm:w-auto"
        >
          Anladım
          <MaterialIcon name="check" className="text-[17px]" />
        </button>
      </div>
    </aside>
  );
}
