"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { MaterialIcon } from "@/components/ui/icons";

export function ImpersonationBanner() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function stop() {
    setPending(true);
    const response = await fetch("/api/admin/impersonation", { method: "DELETE" });
    if (response.ok) {
      router.push("/admin");
      router.refresh();
      return;
    }
    setPending(false);
  }

  return (
    <div className="fixed left-0 right-0 top-16 z-30 border-b border-amber-300 bg-amber-50 px-4 py-2 text-amber-950 lg:left-sidebar-width">
      <div className="flex items-center justify-between gap-4">
        <p className="flex items-center gap-2 text-xs font-semibold sm:text-sm">
          <MaterialIcon name="visibility" className="text-base" />
          Öğretmen hesabını admin olarak görüntülüyorsunuz.
        </p>
        <button type="button" onClick={() => void stop()} disabled={pending} className="shrink-0 rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-800 disabled:opacity-50">
          {pending ? "Dönülüyor…" : "Admin Panele Dön"}
        </button>
      </div>
    </div>
  );
}
