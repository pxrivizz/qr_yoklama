import type { DefaultSession } from "next-auth";

import type { UserRole } from "@/generated/prisma/enums";
import type { LoginMode } from "@/lib/auth/role-policy";

declare module "next-auth" {
  interface User {
    role?: UserRole;
    roles?: UserRole[];
    authVersion?: number;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: UserRole;
      roles: UserRole[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    roles?: UserRole[];
    authVersion?: number;
    loginMode?: LoginMode;
  }
}
