"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { BrandMark } from "@/components/brand/brand-mark";
import { MaterialIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type NavItem = {
  label: string;
  href: string;
  icon: string;
  activePrefix?: string;
};

const mainNavItems: NavItem[] = [
  { label: "Genel bakış", href: "/ogretmen", icon: "dashboard" },
  { label: "Derslerim", href: "/ogretmen/dersler", icon: "menu_book", activePrefix: "/ogretmen/ders" },
];

function isActive(pathname: string, item: NavItem) {
  if (item.activePrefix) return pathname.startsWith(item.activePrefix);
  return pathname === item.href;
}

type SideNavProps = {
  open?: boolean;
  onClose?: () => void;
};

export function SideNav({ open = false, onClose }: SideNavProps) {
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (openRef.current && onClose) {
      onClose();
    }
  }, [pathname, onClose]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose?.();
        return;
      }
      if (event.key !== "Tab" || !sidebarRef.current) return;

      const focusable = Array.from(
        sidebarRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      );
      const first = focusable[0];
      const last = focusable.at(-1);

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose, open]);

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#0b0f17] border-r border-white/[0.08] text-white shadow-2xl lg:shadow-none">
      <div className="relative border-b border-white/[0.08] px-6 py-6">
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 grid size-10 place-items-center rounded-lg text-neutral-300 transition-colors hover:bg-white/[0.08] hover:text-white lg:hidden"
          aria-label="Menüyü kapat"
        >
          <MaterialIcon name="close" className="text-xl" />
        </button>
        <Link href="/ogretmen" className="flex items-center gap-3 group">
          <BrandMark
            variant="sidebar"
            className="size-10 transition-transform duration-200 group-hover:scale-105"
            priority
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold tracking-tight text-white flex items-center gap-2">
              DersDevam
            </h1>
            <p className="mt-0.5 text-xs text-neutral-400 truncate">
              Öğretim Portalı
            </p>
          </div>
        </Link>
      </div>

      <div className="px-4 pt-4">
        <p className="px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
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
                "group relative flex items-center rounded-xl px-3.5 py-2.5 text-sm font-medium transition-[background-color,color,box-shadow,transform] duration-150 ease-out",
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

      <div className="border-t border-white/[0.08] p-4">
        <div className="rounded-xl bg-white/[0.045] p-3.5 ring-1 ring-inset ring-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-400/10 text-emerald-300">
              <MaterialIcon name="qr_code_2" className="text-lg" />
            </span>
            <p className="text-xs font-semibold text-white">Sınıf içi yoklama</p>
          </div>
          <p className="mt-2.5 text-xs leading-5 text-neutral-400">
            Ders kartından yoklamayı başlatın ve yenilenen QR kodunu sınıfla paylaşın.
          </p>
        </div>
        <p className="mt-3 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-400">
          DersDevam · Öğretim Portalı
        </p>
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
        ref={sidebarRef}
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label={open ? "Öğretmen menüsü" : undefined}
        className={cn(
          "fixed bottom-0 left-0 top-0 z-50 w-sidebar-width overscroll-contain transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:z-20 lg:visible lg:translate-x-0",
          open ? "visible translate-x-0 shadow-2xl" : "invisible -translate-x-full",
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
