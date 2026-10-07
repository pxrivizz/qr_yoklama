"use client";

import { useFormStatus } from "react-dom";

import { BrandMark } from "@/components/brand/brand-mark";
import { MaterialIcon } from "@/components/ui/icons";

export function SignInSubmit() {
  const { pending } = useFormStatus();

  return (
    <>
      <button
        type="submit"
        disabled={pending}
        aria-disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2.5 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-wait disabled:bg-neutral-800"
      >
        {pending && <MaterialIcon name="progress_activity" className="animate-spin text-base" />}
        {pending ? "Giriş yapılıyor…" : "Google ile Giriş Yap"}
      </button>

      {pending && (
        <div
          className="signin-transition"
          role="status"
          aria-live="polite"
          aria-label="Giriş yapılıyor, panel hazırlanıyor"
        >
          <div className="signin-transition__glow" aria-hidden="true" />
          <div className="signin-transition__mark" aria-hidden="true">
            <span className="signin-transition__orbit" />
            <span className="signin-transition__logo">
              <BrandMark className="size-14" />
            </span>
          </div>
          <div className="relative text-center">
            <p className="text-sm font-semibold text-neutral-900">Oturumunuz hazırlanıyor</p>
            <p className="mt-1 text-xs text-neutral-500">Size uygun panel açılıyor…</p>
          </div>
        </div>
      )}
    </>
  );
}
