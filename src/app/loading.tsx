import { BrandMark } from "@/components/brand/brand-mark";

export default function Loading() {
  return (
    <main
      className="grid min-h-dvh place-items-center bg-background px-6"
      role="status"
      aria-live="polite"
    >
      <div className="text-center">
        <BrandMark className="mx-auto size-11 animate-pulse" priority />
        <p className="mt-4 text-sm font-medium text-neutral-700">Sayfa hazırlanıyor…</p>
        <span className="sr-only">İçerik yükleniyor</span>
      </div>
    </main>
  );
}
