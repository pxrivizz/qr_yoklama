import Link from "next/link";

import { auth, signOut } from "@/auth";
import { LoginPortalForm } from "@/components/auth/login-portal-form";
import { GraduationCapIcon, MaterialIcon } from "@/components/ui/icons";
import { StatusMessage } from "@/components/ui/status-message";

function getErrorMessage(error?: string | string[]): string | null {
  const errorKey = typeof error === "string" ? error : Array.isArray(error) ? error[0] : null;
  if (!errorKey) return null;
  switch (errorKey) {
    case "Configuration":
      return "Google OAuth yapılandırması tamamlanamadı. Lütfen sistem yöneticisine başvurun.";
    case "AccessDenied":
      return "Giriş reddedildi. Lütfen bilgilerinizi kontrol edin.";
    default:
      return "Giriş yapılırken bir hata oluştu. Lütfen bilgilerinizi kontrol edin.";
  }
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[]; oturum?: string | string[] }>;
}) {
  const session = await auth();
  const { error, oturum } = await searchParams;
  const errorMessage = getErrorMessage(error);
  const sessionMessage = oturum === "zaman-asimi"
    ? "Güvenliğiniz için 20 dakika işlem yapılmayan oturumunuz kapatıldı."
    : null;

  return (
    <main className="flex min-h-dvh flex-col justify-between bg-neutral-50/60 p-4 sm:p-8">
      <header className="mx-auto flex w-full max-w-md items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-neutral-600 transition-colors hover:text-neutral-900"
        >
          <MaterialIcon name="arrow_back" className="text-base" />
          Ana sayfa
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2.5 text-xs font-semibold text-neutral-900 transition-opacity hover:opacity-80"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-neutral-900 text-white shadow-xs">
            <GraduationCapIcon className="size-3.5" />
          </span>
          MSKÜ Yoklama
        </Link>
      </header>

      <div className="mx-auto my-auto w-full max-w-md py-6">
        <div className="rounded-2xl border border-neutral-200/90 bg-white p-6 sm:p-8 shadow-sm">
          <div className="text-center mb-6">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-sm">
              <GraduationCapIcon className="size-6" />
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-neutral-900">
              Giriş Portalı
            </h1>
            <p className="mt-1 text-xs text-neutral-500">
              Devam etmek için rolünüzü seçin
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5">
              <StatusMessage variant="error">
                {errorMessage}
              </StatusMessage>
            </div>
          )}

          {sessionMessage && !session?.user && (
            <div className="mb-5">
              <StatusMessage>{sessionMessage}</StatusMessage>
            </div>
          )}

          {session?.user ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-5">
              <div className="flex items-center gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-full bg-neutral-200 font-semibold text-xs text-neutral-700">
                  {(session.user.name ?? session.user.email ?? "U").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {session.user.name ?? session.user.email}
                  </p>
                  <p className="truncate text-xs text-neutral-500">{session.user.email}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-neutral-600">
                Bu hesapla oturumunuz açık bulunuyor ({session.user.role === "ADMIN" ? "Yönetici" : session.user.role === "TEACHER" ? "Öğretim Elemanı" : "Öğrenci"}).
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Link
                  href="/panel"
                  className="inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 shadow-none"
                >
                  Panele Devam Et
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/giris" });
                  }}
                >
                  <button
                    type="submit"
                    className="inline-flex min-h-9 w-full items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
                  >
                    Farklı hesapla giriş yap
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <LoginPortalForm />
          )}
        </div>
      </div>

      <footer className="mx-auto w-full max-w-md text-center">
        <p className="text-xs text-neutral-400">
          MSKÜ · Ders Yoklama Sistemi
        </p>
      </footer>
    </main>
  );
}
