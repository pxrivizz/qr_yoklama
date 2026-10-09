import Link from "next/link";

import { legalDocuments } from "@/lib/legal/documents";

export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav className={className} aria-label="Yasal bilgilendirmeler">
      {legalDocuments.map((document) => (
        <Link
          key={document.href}
          href={document.href}
          className="underline decoration-neutral-300 underline-offset-4 transition-colors hover:text-neutral-900 hover:decoration-neutral-500"
        >
          {document.label}
        </Link>
      ))}
    </nav>
  );
}
