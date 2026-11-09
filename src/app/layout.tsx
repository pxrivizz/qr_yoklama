import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SessionIdleGuard } from "@/components/auth/session-idle-guard";
import { BugReportWidget } from "@/components/bug-reports/bug-report-widget";
import { CookieNotice } from "@/components/legal/cookie-notice";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: "DersDevam",
  title: {
    default: "DersDevam | QR Kodlu Ders Yoklama Sistemi",
    template: "%s | DersDevam",
  },
  description:
    "QR kod, okul ağı ve konum doğrulamasıyla hızlı ve güvenli ders yoklaması yönetin.",
  keywords: [
    "QR yoklama",
    "ders devam takip sistemi",
    "öğrenci yoklama",
    "Muğla Sıtkı Koçman Üniversitesi",
  ],
  authors: [{ name: "Halil Çiftçi", url: "https://github.com/pxrivizz" }],
  creator: "Halil Çiftçi",
  category: "education",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "/",
    siteName: "DersDevam",
    title: "DersDevam | QR Kodlu Ders Yoklama Sistemi",
    description:
      "QR kod, okul ağı ve konum doğrulamasıyla hızlı ve güvenli ders yoklaması yönetin.",
  },
  twitter: {
    card: "summary_large_image",
    title: "DersDevam | QR Kodlu Ders Yoklama Sistemi",
    description:
      "QR kod, okul ağı ve konum doğrulamasıyla hızlı ve güvenli ders yoklaması yönetin.",
    images: [{ url: "/opengraph-image", alt: "DersDevam QR kodlu ders yoklama sistemi" }],
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  other: {
    "developer-message": "Halil Çiftçi tarafından geliştirildi.",
    "developer-github": "https://github.com/pxrivizz",
    "developer-linkedin": "https://www.linkedin.com/in/halil-ciftci/",
  },
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
