"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/icons";
import { StatusMessage } from "@/components/ui/status-message";

type AdminAccount = {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date | string;
  hasPassword: boolean;
};

type ApiBody = { error?: { message?: string }; data?: AdminAccount[] };

export function AdminAccountManager({
  currentAdminId,
  initialAdmins,
}: {
  currentAdminId: string;
  initialAdmins: AdminAccount[];
}) {
  const router = useRouter();
  const [admins, setAdmins] = useState(initialAdmins);
  const [pending, setPending] = useState(false);
  const [removingId, setRemovingId] = useState<string>();
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  async function createAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setSuccess(undefined);
    setPending(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          temporaryPassword: formData.get("temporaryPassword"),
        }),
      });
      const body = (await response.json()) as ApiBody;
      if (!response.ok) throw new Error(body.error?.message ?? "Yönetici hesabı oluşturulamadı.");

      form.reset();
      setSuccess("Yönetici yetkisi kaydedildi.");

      const refreshed = await fetch("/api/admin/accounts").then((result) => result.json()) as ApiBody;
      if (refreshed.data) setAdmins(refreshed.data);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Yönetici hesabı oluşturulamadı.");
    } finally {
      setPending(false);
    }
  }

  async function removeAccess(admin: AdminAccount) {
    setError(undefined);
    setSuccess(undefined);
    setPending(true);
    try {
      const response = await fetch(`/api/admin/accounts/${admin.id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmationEmail }),
      });
      const body = (await response.json()) as ApiBody;
      if (!response.ok) throw new Error(body.error?.message ?? "Yönetici yetkisi kaldırılamadı.");

      const refreshed = await fetch("/api/admin/accounts").then((result) => result.json()) as ApiBody;
      if (refreshed.data) setAdmins(refreshed.data);
      setRemovingId(undefined);
      setConfirmationEmail("");
      setSuccess(`${admin.email} için yönetici erişimi kaldırıldı.`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Yönetici yetkisi kaldırılamadı.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(20rem,0.82fr)_minmax(0,1.18fr)] xl:items-start">
      <section className="overflow-hidden rounded-xl border border-amber-200 bg-white" aria-labelledby="new-admin-heading">
        <div className="border-b border-amber-200 bg-amber-50/70 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-800">
              <MaterialIcon name="shield_person" className="text-xl" />
            </span>
            <div>
              <h3 id="new-admin-heading" className="text-base font-semibold text-neutral-950">Yönetici yetkisi ver</h3>
              <p className="mt-1 text-xs leading-5 text-amber-900/75">Mevcut kullanıcıya ek rol verin veya yeni bir yönetici hesabı oluşturun.</p>
            </div>
          </div>
        </div>

        <form onSubmit={createAccount} className="space-y-4 p-5 sm:p-6">
          <label className="block text-sm font-medium text-neutral-900">
            Ad soyad
            <input name="name" required maxLength={120} autoComplete="name" className="mt-1.5 min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/15" />
          </label>
          <label className="block text-sm font-medium text-neutral-900">
            E-posta
            <input name="email" type="email" required autoComplete="email" className="mt-1.5 min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/15" />
          </label>
          <label className="block text-sm font-medium text-neutral-900">
            Geçici şifre <span className="font-normal text-neutral-500">(yalnız yeni/parolasız hesap için)</span>
            <input name="temporaryPassword" type="password" minLength={10} autoComplete="new-password" className="mt-1.5 min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/15" />
            <span className="mt-1 block text-xs font-normal leading-5 text-neutral-500">Mevcut kullanıcının parolası değiştirilmez.</span>
          </label>

          {(error || success) && (
            <div className="space-y-2">
              {error && <StatusMessage variant="error">{error}</StatusMessage>}
              {success && <StatusMessage variant="success">{success}</StatusMessage>}
            </div>
          )}

          <Button type="submit" className="w-full gap-2 bg-amber-700 hover:bg-amber-800" disabled={pending}>
            <MaterialIcon name="admin_panel_settings" className="text-lg" />
            {pending ? "Kaydediliyor…" : "Yönetici Yetkisini Kaydet"}
          </Button>
        </form>
      </section>

      <section className="min-w-0 overflow-hidden rounded-xl border border-neutral-200 bg-white" aria-labelledby="admin-list-heading">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4 sm:px-6">
          <div>
            <h3 id="admin-list-heading" className="text-base font-semibold text-neutral-950">Yönetici hesapları</h3>
            <p className="mt-1 text-xs text-neutral-500">Sisteme tam yönetim yetkisiyle erişebilen hesaplar</p>
          </div>
          <Badge variant="code">{admins.length}</Badge>
        </div>

        <div className="divide-y divide-neutral-200">
          {admins.map((admin) => {
            const isCurrent = admin.id === currentAdminId;
            return (
              <div key={admin.id}>
                <article className="flex items-center gap-4 px-5 py-4 sm:px-6">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-600">
                    <MaterialIcon name="admin_panel_settings" className="text-xl" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate text-sm font-semibold text-neutral-950">{admin.name?.trim() || "İsimsiz yönetici"}</h4>
                      {isCurrent && <Badge variant="success">Bu hesap</Badge>}
                      {!admin.hasPassword && <Badge variant="warning">Şifre bekliyor</Badge>}
                    </div>
                    <p className="mt-1 truncate text-xs text-neutral-500">{admin.email}</p>
                  </div>
                  {isCurrent ? (
                    <span className="hidden items-center gap-1.5 text-xs font-medium text-neutral-500 sm:inline-flex">
                      <MaterialIcon name="verified_user" className="text-base text-[#075c50]" />
                      Tam yetki
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => {
                        setRemovingId(removingId === admin.id ? undefined : admin.id);
                        setConfirmationEmail("");
                      }}
                    >
                      Yetkiyi kaldır
                    </Button>
                  )}
                </article>
                {removingId === admin.id && (
                  <div className="border-t border-red-100 bg-red-50/70 px-5 py-4 sm:px-6">
                    <p className="text-xs leading-5 text-red-800">
                      Onaylamak için <strong>{admin.email}</strong> adresini yazın. Başka rolleri varsa yalnız admin rolü kaldırılır.
                    </p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input
                        type="email"
                        value={confirmationEmail}
                        onChange={(event) => setConfirmationEmail(event.target.value)}
                        className="min-h-10 flex-1 rounded-lg border border-red-200 bg-white px-3 text-sm outline-none focus:border-red-600"
                        aria-label={`${admin.email} yönetici kaldırma onayı`}
                      />
                      <Button
                        type="button"
                        className="bg-red-700 hover:bg-red-800"
                        disabled={pending || confirmationEmail.trim().toLowerCase() !== admin.email.toLowerCase()}
                        onClick={() => removeAccess(admin)}
                      >
                        {pending ? "Kaldırılıyor…" : "Erişimi kaldır"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-neutral-200 bg-neutral-50 px-5 py-4 text-xs leading-5 text-neutral-600 sm:px-6">
          Yönetici hesabı oluşturma işlemleri güvenlik günlüğüne kaydedilir. Her yönetici kendi hesabıyla giriş yapmalıdır.
        </div>
      </section>
    </div>
  );
}
