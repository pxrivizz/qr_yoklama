import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

import type { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { googleProfileName } from "@/lib/auth/google-profile";
import { hashPassword, safeEqualText, verifyPassword } from "@/lib/auth/password";

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
      profile(profile) {
        return {
          id: profile.sub,
          name: googleProfileName(profile),
          email: profile.email,
          image: profile.picture,
          role: "STUDENT",
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
          const configuredAdminEmail = (
            process.env.ADMIN_EMAIL ?? "admin@example.edu.tr"
          )
            .trim()
            .toLowerCase();
          const configuredAdminPassword = process.env.ADMIN_PASSWORD;

          let user = await prisma.user.findUnique({ where: { email } });

          const isConfiguredAdminEmail =
            email === configuredAdminEmail ||
            email === "admin@example.edu.tr" ||
            email === "admin@mu.edu.tr";

          if (!isConfiguredAdminEmail && user?.role !== "ADMIN") {
            throw new Error("Yönetici e-posta adresi veya şifresi geçersiz.");
          }

          let passwordValid = false;
          if (user?.passwordHash) {
            passwordValid = await verifyPassword(password, user.passwordHash);
          }
          if (!passwordValid && configuredAdminPassword) {
            passwordValid = safeEqualText(password, configuredAdminPassword);
          }
          // Henüz veritabanında şifresi oluşturulmamış ilk admin girişi ise şifreyi kaydet
          if (!passwordValid && !user?.passwordHash && isConfiguredAdminEmail) {
            passwordValid = true;
          }

          if (!passwordValid) {
            throw new Error("Yönetici e-posta adresi veya şifresi geçersiz.");
          }

          const newPasswordHash = user?.passwordHash ?? (await hashPassword(password));

          if (!user) {
            user = await prisma.user.create({
              data: {
                email,
                name: "Sistem Yöneticisi",
                role: "ADMIN",
                emailVerified: new Date(),
                passwordHash: newPasswordHash,
                passwordChangedAt: new Date(),
              },
            });
          } else if (user.role !== "ADMIN" || !user.passwordHash) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                role: "ADMIN",
                passwordHash: newPasswordHash,
                passwordChangedAt: user.passwordChangedAt ?? new Date(),
              },
            });
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name ?? "Sistem Yöneticisi",
            role: user.role,
            authVersion: user.authVersion,
          };
        }

        // ── Akademik Personel Girişi ──
        if (portalRole === "academic") {
          let user = await prisma.user.findUnique({ where: { email } });
          if (!user || user.role !== "TEACHER") {
            throw new Error("E-posta adresi veya şifre hatalı.");
          }

          if (!user.passwordHash) {
            const newHash = await hashPassword(password);
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                passwordHash: newHash,
                passwordChangedAt: new Date(),
              },
            });
          } else {
            const isValid = await verifyPassword(password, user.passwordHash);
            if (!isValid) {
              throw new Error("E-posta adresi veya şifre hatalı.");
            }
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name ?? "Öğretim Elemanı",
            role: user.role,
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
        const existing = await prisma.user.findUnique({
          where: { email },
          select: { id: true, role: true, name: true },
        });
        if (existing && existing.role !== "STUDENT") return false;

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
        // Google ile giriş yalnızca öğrenci içindir, e-posta/şifre (credentials) ise Akademik/Admin içindir
        const targetRole: UserRole =
          account?.provider === "google"
            ? "STUDENT"
            : ((user as { role?: UserRole }).role ?? "TEACHER");

        token.role = targetRole;
        token.authVersion = (user as { authVersion?: number }).authVersion ?? 0;
        token.picture = sanitizePictureForToken(user.image);
      } else if (token.sub) {
        const databaseUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, image: true, email: true, authVersion: true },
        });
        if (!databaseUser) {
          delete token.sub;
          delete token.role;
          delete token.name;
          delete token.email;
          delete token.picture;
          delete token.authVersion;
          return token;
        }

        if (token.authVersion !== databaseUser.authVersion) {
          delete token.sub;
          delete token.role;
          delete token.name;
          delete token.email;
          delete token.picture;
          delete token.authVersion;
          return token;
        }

        token.role = databaseUser.role;
        token.picture = sanitizePictureForToken(databaseUser.image);
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role as UserRole;
        if (token.picture) {
          session.user.image = token.picture as string;
        }
      }

      return session;
    },
  },
});
