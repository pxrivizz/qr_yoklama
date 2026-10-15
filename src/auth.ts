import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

import type { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { googleProfileName } from "@/lib/auth/google-profile";
import { verifyPassword } from "@/lib/auth/password";
import {
  canUseStudentMode,
  hasRole,
  resolveSessionRole,
  type LoginMode,
} from "@/lib/auth/role-policy";

function sanitizePictureForToken(image?: string | null): string | undefined {
  if (!image) return undefined;
  if (image.startsWith("data:") || image.length > 500) {
    return undefined;
  }
  return image;
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: process.env.AUTH_TRUST_HOST === "true",
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        return {
          id: profile.sub,
          name: googleProfileName(profile),
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
    Credentials({
      id: "credentials",
      name: "Kurumsal Giriş",
      credentials: {
        email: { label: "E-Posta", type: "email" },
        password: { label: "Şifre", type: "password" },
        portalRole: { label: "Rol", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Lütfen e-posta adresinizi ve şifrenizi giriniz.");
        }

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);
        const portalRole = String(credentials.portalRole || "academic");

        // ── Admin Girişi ──
        if (portalRole === "admin") {
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user || !hasRole(user.roles, "ADMIN") || !user.passwordHash) {
            throw new Error("Yönetici e-posta adresi veya şifresi geçersiz.");
          }

          if (!(await verifyPassword(password, user.passwordHash))) {
            throw new Error("Yönetici e-posta adresi veya şifresi geçersiz.");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name ?? "Sistem Yöneticisi",
            role: "ADMIN" as const,
            roles: user.roles,
            authVersion: user.authVersion,
          };
        }

        // ── Akademik Personel Girişi ──
        if (portalRole === "academic") {
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user || !hasRole(user.roles, "TEACHER") || !user.passwordHash) {
            throw new Error("E-posta adresi veya şifre hatalı.");
          }

          if (!(await verifyPassword(password, user.passwordHash))) {
            throw new Error("E-posta adresi veya şifre hatalı.");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name ?? "Öğretim Elemanı",
            role: "TEACHER" as const,
            roles: user.roles,
            authVersion: user.authVersion,
          };
        }

        // Öğrenci ise
        throw new Error("Öğrenciler yalnızca Google hesabı ile giriş yapabilir.");
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 20 * 60,
  },
  pages: {
    signIn: "/giris",
  },
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider === "credentials") {
        return true;
      }
      if (account?.provider === "google") {
        const email = (profile?.email ?? user.email)?.trim().toLowerCase();
        if (!email) return false;
        if (profile && "email_verified" in profile && profile.email_verified !== true) {
          return false;
        }
        const existing = await prisma.user.findUnique({
          where: { email },
          select: { id: true, roles: true, name: true },
        });
        if (existing && !canUseStudentMode(existing.roles)) return false;

        const currentGoogleName = googleProfileName(profile ?? {});
        if (existing && currentGoogleName && existing.name !== currentGoogleName) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { name: currentGoogleName },
          });
        }
        return true;
      }
      return false;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id;
        const assignedRoles = (user as { roles?: UserRole[] }).roles ?? [
          (user as { role?: UserRole }).role ?? "STUDENT",
        ];
        const requestedRole = (user as { role?: UserRole }).role;
        const loginMode: LoginMode = account?.provider === "google" ? "google" : "credentials";

        token.loginMode = loginMode;
        token.roles = assignedRoles;
        token.role = resolveSessionRole(assignedRoles, loginMode, requestedRole);
        token.authVersion = (user as { authVersion?: number }).authVersion ?? 0;
        token.picture = sanitizePictureForToken(user.image);
      } else if (token.sub) {
        const databaseUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { roles: true, image: true, email: true, authVersion: true },
        });
        if (!databaseUser) {
          delete token.sub;
          delete token.role;
          delete token.roles;
          delete token.name;
          delete token.email;
          delete token.picture;
          delete token.authVersion;
          return token;
        }

        if (token.authVersion !== databaseUser.authVersion) {
          delete token.sub;
          delete token.role;
          delete token.roles;
          delete token.name;
          delete token.email;
          delete token.picture;
          delete token.authVersion;
          return token;
        }

        const activeRole = resolveSessionRole(
          databaseUser.roles,
          token.loginMode as LoginMode | undefined,
          token.role as UserRole | undefined,
        );
        if (!activeRole) {
          delete token.sub;
          delete token.role;
          delete token.roles;
          delete token.name;
          delete token.email;
          delete token.picture;
          delete token.authVersion;
          return token;
        }

        token.role = activeRole;
        token.roles = databaseUser.roles;
        token.picture = sanitizePictureForToken(databaseUser.image);
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role as UserRole;
        session.user.roles = (token.roles as UserRole[] | undefined) ?? [];
        if (token.picture) {
          session.user.image = token.picture as string;
        }
      }

      return session;
    },
  },
});
