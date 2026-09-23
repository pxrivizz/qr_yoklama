import Link from "next/link";

import { auth, signIn, signOut } from "@/auth";
import { GraduationCapIcon, MaterialIcon } from "@/components/ui/icons";
import { StatusMessage } from "@/components/ui/status-message";

function getErrorMessage(error?: string | string[]): string | null {
  const errorKey = typeof error === "string" ? error : Array.isArray(error) ? error[0] : null;

  if (!errorKey) return null;

  switch (errorKey) {
    case "Configuration":
      return "Google OAuth istemci kimliği (Client ID) veya gizli anahtar (Secret) eksik. Lütfen .env dosyasındaki AUTH_GOOGLE_ID ve AUTH_GOOGLE_SECRET değerlerini kontrol edin.";
    case "AccessDenied":
      return "Giriş izni verilmedi. Lütfen doğrulanmış bir Google hesabı kullanın.";
    case "OAuthAccountNotLinked":
      return "Bu e-posta adresi farklı bir giriş yöntemi ile kayıtlıdır.";
    case "OAuthSignin":
    case "OAuthCallbackError":
      return "Google ile bağlantı kurulamadı. İnternet bağlantınızı ve Google Cloud ayarlarınızı kontrol edin.";
    default:
      return "Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.";
  }
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const session = await auth();
  const { error } = await searchParams;
  const errorMessage = getErrorMessage(error);

  return (
    <main className="flex min-h-dvh flex-col justify-between bg-background p-6 sm:p-10">
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

      <div className="mx-auto my-auto w-full max-w-md py-8">
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 sm:p-8 shadow-none">
          <div className="text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-xs">
              <GraduationCapIcon className="size-6" />
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-neutral-900">
              Giriş Yap
            </h1>
            <p className="mt-1.5 text-xs text-neutral-600">
              Google hesabınızla giriş yapın.
            </p>
          </div>

          {errorMessage && (
            <div className="mt-5">
              <StatusMessage variant="error">
                {errorMessage}
              </StatusMessage>
            </div>
          )}

          {session?.user ? (
            <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50/70 p-5">
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
                Bu hesapla oturumunuz açık bulunuyor.
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
            <div className="mt-6 space-y-4">
              <form
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: "/panel" });
                }}
              >
                <button
                  type="submit"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50 shadow-none"
                >
                  <svg className="size-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Google ile giriş yap
                </button>
              </form>

              <p className="pt-2 text-center text-xs leading-relaxed text-neutral-500">
                Giriş yaparak okul hesabınızın doğrulanmasını kabul edersiniz.
              </p>
            </div>
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
