import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SessionIdleGuard } from "@/components/auth/session-idle-guard";
import { BugReportWidget } from "@/components/bug-reports/bug-report-widget";
import { CookieNotice } from "@/components/legal/cookie-notice";
import "./globals.css";

export const metadata: Metadata = {
  title: "DersDevam",
  description: "QR kod tabanlı güvenli ders devam takip sistemi",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {children}
        <SessionIdleGuard />
        <BugReportWidget />
        <CookieNotice />
      </body>
    </html>
  );
}
