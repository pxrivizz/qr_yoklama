import type { ReactNode } from "react";
import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { LegalLinks } from "@/components/legal/legal-links";
import { MaterialIcon } from "@/components/ui/icons";
import { LEGAL_DOCUMENT_DATE_LABEL } from "@/lib/legal/documents";

type LegalSection = {
  id: string;
  title: string;
  content: ReactNode;
};

export function LegalPage({
  title,
  summary,
  sections,
}: {
  title: string;
  summary: string;
  sections: LegalSection[];
}) {
  return (
    <main className="min-h-dvh bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 font-semibold">
            <BrandMark className="size-8" priority />
            DersDevam
          </Link>
          <Link href="/giris" className="legal-page__portal-link inline-flex min-h-10 items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-950">
            Giriş portalı
            <MaterialIcon name="arrow_forward" className="text-[18px]" />
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
        <aside className="legal-page__nav lg:sticky lg:top-8 lg:self-start">
          <p className="text-xs font-medium text-neutral-500">Son güncelleme: {LEGAL_DOCUMENT_DATE_LABEL}</p>
          <nav className="mt-5 hidden border-t border-neutral-200 pt-5 lg:grid" aria-label={`${title} bölümleri`}>
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="py-2 text-sm text-neutral-500 transition-colors hover:text-neutral-950">
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        <article className="min-w-0">
          <div className="legal-page__intro max-w-3xl border-b border-neutral-200 pb-10">
            <h1 className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-600">{summary}</p>
            <div className="mt-6 flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <MaterialIcon name="gavel" className="mt-0.5 shrink-0 text-[20px]" />
              <p>
                Bu metin, sistemin mevcut teknik işleyişine göre hazırlanmış bir taslaktır. Veri sorumlusunun resmî unvanı, hukuki sebepler, saklama süreleri ve başvuru kanalı kurumun hukuk/KVKK birimi tarafından yayın öncesinde doğrulanmalıdır.
              </p>
            </div>
          </div>

          <div className="max-w-3xl divide-y divide-neutral-200">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-8 py-9 first:pt-10">
                <h2 className="text-xl font-semibold tracking-[-0.02em]">{section.title}</h2>
                <div className="legal-copy mt-4 text-sm leading-7 text-neutral-650">{section.content}</div>
              </section>
            ))}
          </div>
        </article>
      </div>

      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-7 text-xs text-neutral-500 sm:px-8">
          <LegalLinks className="flex flex-wrap gap-x-5 gap-y-2" />
          <span>DersDevam · Ders Yoklama Sistemi</span>
        </div>
      </footer>
    </main>
  );
}
