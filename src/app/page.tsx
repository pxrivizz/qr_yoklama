import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { GraduationCapIcon, MaterialIcon } from "@/components/ui/icons";
import { StatusMessage } from "@/components/ui/status-message";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string | string[] }>;
}) {
  const { hata } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2.5 text-base font-semibold text-neutral-900">
            <span className="flex size-8 items-center justify-center rounded-lg bg-neutral-900 text-white shadow-xs">
              <GraduationCapIcon className="size-4.5" />
            </span>
            MSKÜ Yoklama
          </span>
          <Link
            href="/giris"
            className="rounded-lg border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-800 transition-colors hover:bg-neutral-50 shadow-none"
          >
            Giriş yap
          </Link>
        </div>
      </header>

      <div className="relative overflow-hidden">
        <div className="mx-auto flex max-w-5xl flex-1 flex-col justify-center px-6 py-20 sm:py-28">
          {hata === "oturum" && (
            <StatusMessage variant="error" title="Oturumunuz yok" className="mb-8 max-w-xl">
              Bu sayfayı açmak için önce hesabınızla giriş yapın.
            </StatusMessage>
          )}
          {hata === "yetki" && (
            <StatusMessage variant="error" title="Bu sayfaya erişemezsiniz" className="mb-8 max-w-xl">
              Hesabınızın rolü bu sayfa için uygun değil. Kendi panelinizden devam edin.
            </StatusMessage>
          )}

          <div className="animate-fade-in-up">
            <span className="font-mono text-xs text-neutral-500">
              Muğla Sıtkı Koçman Üniversitesi
            </span>
          </div>

          <h1 className="mt-4 max-w-2xl animate-fade-in-up text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl">
            QR Kodlu Ders Yoklama Sistemi
          </h1>

          <p className="mt-4 max-w-lg animate-fade-in-up text-base leading-relaxed text-neutral-600">
            Derslerde QR kod okutarak öğrenci katılımını hızlı ve güvenli şekilde kaydetmeyi sağlayan yoklama sistemi.
          </p>

          <div className="mt-8 flex animate-fade-in-up flex-wrap gap-3">
            <ButtonLink href="/giris" size="lg">
              Giriş yap
            </ButtonLink>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-200/80 bg-neutral-50/50">
        <ol className="mx-auto grid max-w-5xl gap-6 px-6 py-16 sm:grid-cols-3 sm:py-20">
          {[
            ["school", "Dersi başlat", "Öğretim elemanı ders oturumunu açar ve yoklama QR kodunu yansıtır."],
            ["qr_code_scanner", "QR okut", "Öğrenci telefon kamerasıyla kodu taratarak derse katılır."],
            ["monitoring", "Anlık takip", "Katılan öğrenciler anlık olarak listelenir ve ders yoklaması tamamlanır."],
          ].map(([icon, title, text], index) => (
            <li
              key={title}
              className="rounded-xl border border-neutral-200/80 bg-white p-6 transition-colors hover:border-neutral-300"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-9 place-items-center rounded-lg bg-neutral-100 text-neutral-900">
                  <MaterialIcon name={icon} className="text-lg" />
                </span>
                <span className="font-mono text-xs text-neutral-400">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h2 className="mt-4 text-base font-semibold text-neutral-900">{title}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-neutral-600">{text}</p>
            </li>
          ))}
        </ol>
      </div>

      <footer className="border-t border-neutral-200/80 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <span className="text-xs text-neutral-500">
            MSKÜ · Ders Yoklama Sistemi
          </span>
          <span className="flex items-center gap-1.5 text-xs text-neutral-600">
            <MaterialIcon name="school" className="text-base" /> Muğla Sıtkı Koçman Üniversitesi
          </span>
        </div>
      </footer>
    </main>
  );
}
