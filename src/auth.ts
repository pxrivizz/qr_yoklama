import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import type { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { normalizePersonName } from "@/lib/students/name";

function resolveRoleForEmail(
  email: string | null | undefined,
  currentRole?: UserRole,
): UserRole {
  if (currentRole === "TEACHER") return "TEACHER";
  if (!email) return currentRole ?? "STUDENT";

  const rawConfig = [
    process.env.ALLOWED_TEACHER_EMAIL_DOMAIN,
    process.env.ALLOWED_TEACHER_EMAILS,
  ]
    .filter(Boolean)
    .join(",");

  if (!rawConfig.trim()) return currentRole ?? "STUDENT";

  const entries = rawConfig
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (entries.length === 0) return currentRole ?? "STUDENT";

  const normalizedEmail = email.trim().toLowerCase();
  const emailDomain = normalizedEmail.split("@")[1];

  const isTeacher = entries.some((entry) => {
    const cleanEntry = entry.replace(/^@/, "");
    if (cleanEntry.includes("@")) {
      return normalizedEmail === cleanEntry;
    }
    return emailDomain === cleanEntry || emailDomain?.endsWith(`.${cleanEntry}`);
  });

  return isTeacher ? "TEACHER" : (currentRole ?? "STUDENT");
}

function sanitizePictureForToken(image?: string | null): string | undefined {
  if (!image) return undefined;
  if (image.startsWith("data:") || image.length > 500) {
    return undefined;
  }
  return image;
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Development uses local/custom hosts. Production must explicitly opt in
  // after the deployment proxy is configured to overwrite forwarded headers.
  trustHost:
    process.env.NODE_ENV !== "production" || process.env.AUTH_TRUST_HOST === "true",
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: false,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/giris",
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") {
        return false;
      }

      return profile?.email_verified === true;
    },
    async jwt({ token, user }) {
      if (user) {
        const targetRole = resolveRoleForEmail(user.email, user.role);
        if (user.id && targetRole !== user.role) {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: targetRole },
          });
          token.role = targetRole;
        } else {
          token.role = targetRole;
        }
        token.picture = sanitizePictureForToken(user.image);
      } else if (token.sub) {
        const databaseUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, image: true, email: true },
        });
        const targetRole = resolveRoleForEmail(databaseUser?.email, databaseUser?.role);
        if (databaseUser && targetRole !== databaseUser.role) {
          await prisma.user.update({
            where: { id: token.sub },
            data: { role: targetRole },
          });
          token.role = targetRole;
        } else {
          token.role = databaseUser?.role;
        }
        token.picture = sanitizePictureForToken(databaseUser?.image);
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
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      const targetRole = resolveRoleForEmail(user.email, user.role as UserRole);
      const normalizedName = user.name ? normalizePersonName(user.name) : null;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          role: targetRole,
          ...(normalizedName ? { normalizedName } : {}),
        },
      });
    },
  },
});
