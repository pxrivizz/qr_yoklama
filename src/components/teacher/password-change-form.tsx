"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/icons";
import { StatusMessage } from "@/components/ui/status-message";

export function PasswordChangeForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    setSuccess(false);
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch("/api/teacher/password", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.get("currentPassword"),
          newPassword: data.get("newPassword"),
          confirmPassword: data.get("confirmPassword"),
        }),
      });
      const body = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "Şifre değiştirilemedi.");
      form.reset();
      setSuccess(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Şifre değiştirilemedi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && <StatusMessage variant="error">{error}</StatusMessage>}
      {success && (
        <StatusMessage variant="success" title="Şifreniz güncellendi">
          Bir sonraki girişinizde yeni şifrenizi kullanabilirsiniz.
        </StatusMessage>
      )}

      <label className="block text-sm font-medium text-on-surface">
        Mevcut şifre
        <input name="currentPassword" type="password" required autoComplete="current-password" className="mt-1.5 min-h-11 w-full rounded-lg border border-outline-variant bg-white px-3 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-on-surface">
          Yeni şifre
          <input name="newPassword" type="password" required minLength={10} autoComplete="new-password" className="mt-1.5 min-h-11 w-full rounded-lg border border-outline-variant bg-white px-3 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20" />
        </label>
        <label className="block text-sm font-medium text-on-surface">
          Yeni şifre tekrar
          <input name="confirmPassword" type="password" required minLength={10} autoComplete="new-password" className="mt-1.5 min-h-11 w-full rounded-lg border border-outline-variant bg-white px-3 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20" />
        </label>
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
        <div className="flex items-start gap-3">
          <MaterialIcon name="shield" className="mt-0.5 text-secondary" />
          <div>
            <p className="text-sm font-semibold text-on-surface">Güçlü şifre gereksinimi</p>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">En az 10 karakter; en az bir büyük harf, bir küçük harf ve bir rakam kullanın.</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Güncelleniyor…" : "Şifreyi Güncelle"}
        </Button>
      </div>
    </form>
  );
}
