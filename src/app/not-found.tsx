import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { MaterialIcon } from "@/components/ui/icons";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6 py-16">
      <section className="animate-fade-in-up w-full max-w-lg text-center">
        <Link
          href="/"
          className="mx-auto inline-flex items-center gap-2.5 text-sm font-semibold text-neutral-900"
        >
          <BrandMark className="size-9" priority />
          DersDevam
        </Link>

        <p className="mt-10 font-mono text-sm font-semibold tracking-[0.2em] text-neutral-400">
          404
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          Bu sayfa bulunamadı
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-neutral-600">
          Bağlantı değişmiş, kaldırılmış veya hatalı yazılmış olabilir. Ana sayfaya dönerek güvenli şekilde devam edebilirsiniz.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
          >
            <MaterialIcon name="home" className="text-lg" />
            Ana sayfaya dön
          </Link>
          <Link
            href="/giris"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50"
          >
            Giriş sayfasına git
          </Link>
        </div>
      </section>
    </main>
  );
}
