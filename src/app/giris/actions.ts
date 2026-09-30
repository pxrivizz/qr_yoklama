"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export type LoginActionResult = {
  success?: boolean;
  error?: string;
};

export async function loginWithCredentialsAction(
  formData: FormData,
): Promise<LoginActionResult> {
  try {
    formData.set("redirectTo", "/panel");
    await signIn("credentials", formData);
    return { success: true };
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    const causeMessage = (
      error as { cause?: { err?: { message?: string } } }
    )?.cause?.err?.message;
    if (causeMessage && !causeMessage.includes("errors.authjs.dev")) {
      return { error: causeMessage };
    }
    if (error instanceof AuthError) {
      if (
        error.type === "CredentialsSignin" ||
        error.type === "CallbackRouteError" ||
        error.message.includes("errors.authjs.dev")
      ) {
        return { error: "E-posta adresi veya şifre hatalı." };
      }
      return { error: error.message || "Giriş yapılırken bir hata oluştu." };
    }
    if (error instanceof Error && !error.message.includes("errors.authjs.dev")) {
      return { error: error.message };
    }
    return { error: "E-posta adresi veya şifre hatalı." };
  }
}

export async function loginWithGoogleAction() {
  await signIn("google", { redirectTo: "/panel" });
}
