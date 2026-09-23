"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { MaterialIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type NavItem = {
  label: string;
  href: string;
  icon: string;
  activePrefix?: string;
};

const mainNavItems: NavItem[] = [
  { label: "Genel Bakış", href: "/ogretmen", icon: "dashboard" },
  { label: "Derslerim", href: "/ogretmen/dersler", icon: "school", activePrefix: "/ogretmen/ders" },
  { label: "QR Okutma Logları", href: "/ogretmen/loglar", icon: "receipt_long" },
];

const secondaryNavItems: NavItem[] = [
  { label: "Profilim", href: "/ogretmen", icon: "person" },
];

function isActive(pathname: string, item: NavItem) {
  if (item.activePrefix) return pathname.startsWith(item.activePrefix);
  return pathname === item.href;
}

type SideNavProps = {
  userName: string;
  onSignOut: () => void;
  open?: boolean;
  onClose?: () => void;
};

export function SideNav({ userName, onSignOut, open = false, onClose }: SideNavProps) {
  const pathname = usePathname();

  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (openRef.current && onClose) {
      onClose();
    }
  }, [pathname, onClose]);

  const initials = userName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("tr-TR");

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#0b0f17] border-r border-white/[0.08] text-white shadow-2xl lg:shadow-none">
      <div className="border-b border-white/[0.08] px-6 py-6">
        <Link href="/ogretmen" className="flex items-center gap-3 group">
          <span className="grid size-10 place-items-center rounded-xl bg-white/10 text-white border border-white/10 shadow-inner transition-transform duration-200 group-hover:scale-105">
            <MaterialIcon name="school" className="text-xl" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold tracking-tight text-white flex items-center gap-2">
              MSKÜ Yoklama
            </h1>
            <p className="mt-0.5 text-xs text-neutral-400 truncate">
              Öğretim Portalı
            </p>
          </div>
        </Link>
      </div>

      <div className="px-4 pt-4">
        <p className="px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500">
          Menü
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Ana menü">
        {mainNavItems.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ease-out",
                active
                  ? "bg-white/[0.12] text-white shadow-sm backdrop-blur-md"
                  : "text-neutral-400 hover:bg-white/[0.06] hover:text-white",
              )}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-white"
                  aria-hidden="true"
                />
              )}
              <MaterialIcon
                name={item.icon}
                className={cn(
                  "mr-3.5 text-lg transition-transform duration-200 ease-out",
                  active ? "text-white" : "text-neutral-400 group-hover:text-white group-hover:translate-x-0.5",
                )}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.08] px-3 py-4 space-y-3">
        <div className="space-y-1">
          {secondaryNavItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="group flex items-center rounded-xl px-3.5 py-2 text-xs font-medium text-neutral-400 transition-all duration-200 ease-out hover:bg-white/[0.06] hover:text-white"
            >
              <MaterialIcon
                name={item.icon}
                className="mr-3 text-base text-neutral-400 transition-transform duration-200 group-hover:scale-105 group-hover:text-white"
              />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10 text-xs font-semibold text-white border border-white/10">
              {initials || "Ö"}
            </span>
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-xs font-medium text-white">
                {userName}
              </strong>
              <span className="block text-[11px] text-neutral-400 truncate">
                Öğretim Elemanı
              </span>
            </div>
          </div>

          <form action={onSignOut}>
            <button
              type="submit"
              className="rounded-lg p-1.5 text-neutral-400 transition-colors duration-200 hover:bg-white/10 hover:text-red-400"
              title="Çıkış Yap"
              aria-label="Çıkış Yap"
            >
              <MaterialIcon name="logout" className="text-lg" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-sidebar-width transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:translate-x-0 lg:z-20",
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full",
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
