import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

import { getServerEnv } from "@/lib/env";

export const IMPERSONATION_COOKIE = "teacher_impersonation";
const IMPERSONATION_SECONDS = 15 * 60;

type ImpersonationClaims = {
  adminId: string;
  teacherId: string;
};

function secret() {
  return new TextEncoder().encode(getServerEnv().AUTH_SECRET);
}

export async function createImpersonationToken(adminId: string, teacherId: string) {
  return new SignJWT({ adminId, teacherId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("qr-yoklama")
    .setAudience("teacher-impersonation")
    .setIssuedAt()
    .setExpirationTime(`${IMPERSONATION_SECONDS}s`)
    .sign(secret());
}

export async function verifyImpersonationToken(
  token: string,
): Promise<ImpersonationClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: "qr-yoklama",
      audience: "teacher-impersonation",
    });
    if (typeof payload.adminId !== "string" || typeof payload.teacherId !== "string") {
      return null;
    }
    return { adminId: payload.adminId, teacherId: payload.teacherId };
  } catch {
    return null;
  }
}

export async function getActiveImpersonation(adminId: string) {
  const token = (await cookies()).get(IMPERSONATION_COOKIE)?.value;
  if (!token) return null;
  const claims = await verifyImpersonationToken(token);
  return claims?.adminId === adminId ? claims : null;
}

export const impersonationCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: IMPERSONATION_SECONDS,
};
