"use client";

import { useCallback, useState } from "react";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="min-h-dvh bg-background">
      <SideNav
        userName={userName}
        onSignOut={onSignOut}
        open={sidebarOpen}
        onClose={closeSidebar}
        isImpersonating={isImpersonating}
      />
      <TopAppBar
        title={pageTitle}
        showSearch={showSearch}
        searchPlaceholder={searchPlaceholder}
        userImage={userImage}
        onMenuToggle={openSidebar}
      />
      {isImpersonating && <ImpersonationBanner />}
      <main className={isImpersonating ? "pt-28 lg:ml-sidebar-width" : "pt-16 lg:ml-sidebar-width"}>{children}</main>
    </div>
  );
}
