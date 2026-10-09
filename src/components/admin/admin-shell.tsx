"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { BrandMark } from "@/components/brand/brand-mark";
import { MaterialIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type AdminShellProps = {
  email: string;
  children: React.ReactNode;
  onSignOut: () => void;
};

const navItems = [
  { label: "Genel Bakış", href: "#genel-bakis", icon: "space_dashboard" },
  { label: "Destek Kayıtları", href: "#destek", icon: "support_agent" },
  { label: "Öğretmenler", href: "#ogretmenler", icon: "group" },
  { label: "Yöneticiler", href: "#yoneticiler", icon: "admin_panel_settings" },
];

export function AdminShell({ email, children, onSignOut }: AdminShellProps) {
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [activeHref, setActiveHref] = useState("#genel-bakis");
  const sidebarRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const sections = navItems
      .map((item) => document.querySelector(item.href))
      .filter((section): section is Element => Boolean(section));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveHref(`#${visible.target.id}`);
      },
      { rootMargin: "-20% 0px -65%", threshold: [0, 0.1, 0.5] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const menuButton = menuButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab" || !sidebarRef.current) return;
      const focusable = Array.from(sidebarRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      menuButton?.focus();
    };
  }, [close, open]);

  const sidebar = (
    <div className="flex h-full flex-col border-r border-white/[0.08] bg-[#09131f] text-white">
      <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-5">
        <a href="#genel-bakis" onClick={close} className="flex items-center gap-3">
          <BrandMark variant="sidebar" className="size-10" priority />
          <div>
            <p className="text-base font-semibold tracking-tight">DersDevam</p>
            <p className="mt-0.5 text-xs text-white/50">Yönetim Portalı</p>
          </div>
        </a>
        <button ref={closeButtonRef} type="button" onClick={close} className="grid size-9 place-items-center rounded-lg text-white/60 hover:bg-white/[0.08] hover:text-white lg:hidden" aria-label="Menüyü kapat">
          <MaterialIcon name="close" className="text-xl" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Yönetim menüsü">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            onClick={() => { setActiveHref(item.href); close(); }}
            aria-current={activeHref === item.href ? "page" : undefined}
            className={cn(
              "group flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-colors",
              activeHref === item.href
                ? "bg-white/[0.1] text-white"
                : "text-white/58 hover:bg-white/[0.06] hover:text-white",
            )}
          >
            <MaterialIcon
              name={item.icon}
              className={cn("text-[20px]", activeHref === item.href ? "text-[#6ffbbe]" : "text-white/45 group-hover:text-white")}
            />
            {item.label}
          </a>
        ))}
      </nav>

      <div className="border-t border-white/[0.08] p-3">
        <div className="rounded-xl bg-white/[0.04] p-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10 text-xs font-semibold">Y</span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white">Yönetici</p>
              <p className="truncate text-[11px] text-white/48">{email}</p>
            </div>
          </div>
          <form action={onSignOut} className="mt-3 border-t border-white/[0.08] pt-2">
            <button type="submit" className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-xs font-medium text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white">
              <MaterialIcon name="logout" className="text-base" />
              Çıkış yap
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-[#f6f8fa]">
      {open && <button type="button" aria-label="Menüyü kapat" onClick={close} className="fixed inset-0 z-40 bg-black/55 lg:hidden" />}
      <aside
        ref={sidebarRef}
        inert={!open && !isDesktop ? true : undefined}
        aria-hidden={!open && !isDesktop}
        className={cn("fixed inset-y-0 left-0 z-50 w-[248px] transition-transform duration-200 lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}
      >
        {sidebar}
      </aside>

      <header inert={open ? true : undefined} className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-200/80 bg-white px-4 lg:left-[248px] lg:px-8">
        <div className="flex items-center gap-3">
          <button ref={menuButtonRef} type="button" onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-lg text-neutral-600 hover:bg-neutral-100 lg:hidden" aria-label="Menüyü aç">
            <MaterialIcon name="menu" className="text-xl" />
          </button>
          <h1 className="text-base font-semibold tracking-tight text-neutral-950 sm:text-lg">Yönetim merkezi</h1>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-neutral-600">
          <span className="size-2 rounded-full bg-[#075c50]" aria-hidden="true" />
          <span className="hidden sm:inline">Yönetici oturumu</span>
        </div>
      </header>

      <main inert={open ? true : undefined} className="pt-16 lg:ml-[248px]">{children}</main>
    </div>
  );
}
