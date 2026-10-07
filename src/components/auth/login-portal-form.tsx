"use client";

import { useState, useTransition } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { MaterialIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { loginWithCredentialsAction, loginWithGoogleAction } from "@/app/giris/actions";
import { SignInSubmit } from "@/components/auth/sign-in-submit";

type PortalRole = "student" | "academic" | "admin";

export function LoginPortalForm() {
  const [selectedRole, setSelectedRole] = useState<PortalRole>("student");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRoleChange = (role: PortalRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
  };

  const handleCredentialsSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    formData.set("portalRole", selectedRole);

    startTransition(async () => {
      const res = await loginWithCredentialsAction(formData);
      if (res?.error) {
        setErrorMessage(res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* ── 3-Way Role Selector Tabs ── */}
      <div className="grid grid-cols-3 p-1 rounded-xl bg-neutral-100 border border-neutral-200">
        <button
          type="button"
          onClick={() => handleRoleChange("student")}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-lg transition-all",
            selectedRole === "student"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-900"
          )}
        >
          <MaterialIcon name="school" className="text-base text-emerald-600" />
          <span>Öğrenci</span>
        </button>

        <button
          type="button"
          onClick={() => handleRoleChange("academic")}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-lg transition-all",
            selectedRole === "academic"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-900"
          )}
        >
          <MaterialIcon name="badge" className="text-base text-blue-600" />
          <span>Akademik</span>
        </button>

        <button
          type="button"
          onClick={() => handleRoleChange("admin")}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-lg transition-all",
            selectedRole === "admin"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-900"
          )}
        >
          <MaterialIcon name="admin_panel_settings" className="text-base text-amber-600" />
          <span>Admin</span>
        </button>
      </div>

      {/* ── Error Banner ── */}
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2">
          <MaterialIcon name="error" className="text-base text-red-500 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── 1. ÖĞRENCİ GİRİŞİ (Sadece Google, Kurumsal Zorunluluk Yok) ── */}
      {selectedRole === "student" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="text-center">
            <h2 className="text-base font-bold text-neutral-900">Öğrenci Girişi</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Google hesabınızla giriş yapın
            </p>
          </div>

          <form action={loginWithGoogleAction} className="pt-2">
            <SignInSubmit />
          </form>
        </div>
      )}

      {/* ── 2. AKADEMİK PERSONEL GİRİŞİ (Sadece Mail + Şifre, Google Yok) ── */}
      {selectedRole === "academic" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="text-center">
            <h2 className="text-base font-bold text-neutral-900">Akademik Personel Girişi</h2>
            <p className="mt-1 text-xs text-neutral-500">
              E-posta ve şifrenizle giriş yapın
            </p>
          </div>

          <form onSubmit={handleCredentialsSubmit} className="space-y-3.5 pt-1">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                E-Posta
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <MaterialIcon name="mail" className="text-base" />
                </span>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="ad.soyad@mu.edu.tr"
                  className="w-full rounded-lg border border-neutral-300 pl-9 pr-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Şifre
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <MaterialIcon name="lock" className="text-base" />
                </span>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-neutral-300 pl-9 pr-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 shadow-sm"
            >
              {isPending && <MaterialIcon name="progress_activity" className="animate-spin text-base" />}
              {isPending ? "Giriş yapılıyor…" : "Giriş Yap"}
            </button>
          </form>
        </div>
      )}

      {/* ── 3. ADMIN GİRİŞİ (Sadece Mail + Şifre, Google Yok) ── */}
      {selectedRole === "admin" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="text-center">
            <h2 className="text-base font-bold text-neutral-900">Admin Girişi</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Yönetici e-posta ve şifrenizle giriş yapın
            </p>
          </div>

          <form onSubmit={handleCredentialsSubmit} className="space-y-3.5 pt-1">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                E-Posta
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <MaterialIcon name="admin_panel_settings" className="text-base text-amber-600" />
                </span>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="admin@mu.edu.tr"
                  className="w-full rounded-lg border border-neutral-300 pl-9 pr-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Şifre
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <MaterialIcon name="key" className="text-base text-amber-600" />
                </span>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-neutral-300 pl-9 pr-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 shadow-sm"
            >
              {isPending && <MaterialIcon name="progress_activity" className="animate-spin text-base" />}
              {isPending ? "Giriş yapılıyor…" : "Giriş Yap"}
            </button>
          </form>
        </div>
      )}

      {/* ── Tam Ekran Geçiş Animasyonu (Akademik & Admin) ── */}
      {isPending && (
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
    </div>
  );
}
