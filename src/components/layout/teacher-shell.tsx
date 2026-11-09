"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SideNav } from "@/components/layout/side-nav";
import { TopAppBar } from "@/components/layout/top-app-bar";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";

type TeacherShellProps = {
  userName: string;
  userImage?: string | null;
  pageTitle: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  children: React.ReactNode;
  onSignOut: () => void;
  isImpersonating?: boolean;
};

export function TeacherShell({
  userName,
  userImage,
  pageTitle,
  showSearch,
  searchPlaceholder,
  children,
  onSignOut,
  isImpersonating = false,
}: TeacherShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const previousPathRef = useRef(pathname);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    if (previousPathRef.current === pathname) return;
    previousPathRef.current = pathname;
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#ana-icerik"
        className="fixed left-4 top-3 z-[100] -translate-y-20 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-lg transition-transform focus:translate-y-0"
      >
        Ana içeriğe geç
      </a>
      <SideNav
        open={sidebarOpen}
        onClose={closeSidebar}
      />
      <div inert={sidebarOpen ? true : undefined}>
        <TopAppBar
          title={pageTitle}
          showSearch={showSearch}
          searchPlaceholder={searchPlaceholder}
          userName={userName}
          userImage={userImage}
          userRole={isImpersonating ? "Yönetici · Öğretmen görünümü" : "Öğretim elemanı"}
          showAccountSettings={!isImpersonating}
          onSignOut={onSignOut}
          onMenuToggle={openSidebar}
        />
        {isImpersonating && <ImpersonationBanner />}
        <main
          ref={mainRef}
          id="ana-icerik"
          tabIndex={-1}
          className={isImpersonating ? "pt-28 lg:ml-sidebar-width" : "pt-16 lg:ml-sidebar-width"}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
