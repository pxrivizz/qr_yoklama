"use client";

import { MaterialIcon } from "@/components/ui/icons";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type TopAppBarProps = {
  title: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  userName: string;
  userImage?: string | null;
  userRole: string;
  showAccountSettings?: boolean;
  onSignOut: () => void;
  onMenuToggle?: () => void;
};

export function TopAppBar({
  title,
  showSearch = false,
  searchPlaceholder = "Ara…",
  userName,
  userImage,
  userRole,
  showAccountSettings = true,
  onSignOut,
  onMenuToggle,
}: TopAppBarProps) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!accountMenuOpen) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
        accountButtonRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [accountMenuOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-10 flex h-16 items-center justify-between border-b border-outline-variant bg-surface-container-lowest/85 px-4 shadow-none backdrop-blur-md sm:px-6 lg:left-sidebar-width lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container lg:hidden"
          aria-label="Menüyü aç"
        >
          <MaterialIcon name="menu" className="text-xl" />
        </button>
        <h2 className="text-base font-semibold text-on-surface">{title}</h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {showSearch && (
          <form
            action="/ogretmen/dersler"
            method="GET"
            className="relative hidden sm:block"
            role="search"
            aria-label="Derslerde ara"
          >
            <MaterialIcon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant"
            />
            <input
              type="search"
              name="search"
              aria-label="Derslerde ara"
              placeholder={searchPlaceholder}
              className="w-48 rounded-lg border border-outline bg-surface-container-low py-1.5 pl-9 pr-4 text-base text-on-surface placeholder:text-on-surface-variant transition-colors focus:border-primary focus:outline-none sm:w-64 sm:text-sm"
            />
          </form>
        )}

        <div ref={accountMenuRef} className="relative">
          <button
            ref={accountButtonRef}
            type="button"
            onClick={() => setAccountMenuOpen((open) => !open)}
            className="flex min-h-10 items-center gap-2 rounded-xl px-1.5 py-1 text-on-surface-variant transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            aria-label={`${userName} hesap menüsünü aç`}
            aria-expanded={accountMenuOpen}
            aria-controls="teacher-account-panel"
          >
            <span className="hidden max-w-44 truncate pl-1 text-sm font-medium text-on-surface sm:block">
              {userName}
            </span>
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-outline-variant bg-surface-container text-on-surface-variant">
              {userImage ? (
                <Image src={userImage} alt="" width={36} height={36} unoptimized className="h-full w-full object-cover" />
              ) : (
                <MaterialIcon name="person" className="text-lg" />
              )}
            </span>
            <MaterialIcon
              name="expand_more"
              className={`hidden text-base text-on-surface-variant transition-transform duration-200 sm:block ${accountMenuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {accountMenuOpen && (
            <div
              id="teacher-account-panel"
              className="absolute right-0 top-12 w-72 overflow-hidden overscroll-contain rounded-xl border border-outline-variant bg-surface-container-lowest shadow-xl shadow-primary/10"
            >
              <div className="border-b border-outline-variant px-4 py-3.5">
                <p className="truncate text-sm font-semibold text-on-surface">{userName}</p>
                <p className="mt-0.5 text-xs text-on-surface-variant">{userRole}</p>
              </div>

              <div className="p-1.5">
                {showAccountSettings && (
                  <Link
                    href="/ogretmen/hesap"
                    onClick={() => setAccountMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  >
                    <MaterialIcon name="manage_accounts" className="text-lg text-on-surface-variant" />
                    Hesap ayarları
                  </Link>
                )}
                <form action={onSignOut}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-700 transition-colors hover:bg-red-50 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/20"
                  >
                    <MaterialIcon name="logout" className="text-lg" />
                    Çıkış yap
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
