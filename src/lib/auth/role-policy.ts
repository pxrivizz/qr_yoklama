import type { UserRole } from "@/generated/prisma/enums";

export type LoginMode = "credentials" | "google";

export function hasRole(roles: readonly UserRole[], role: UserRole): boolean {
  return roles.includes(role);
}

export function canUseStudentMode(roles: readonly UserRole[]): boolean {
  return hasRole(roles, "STUDENT");
}

export function resolveSessionRole(
  roles: readonly UserRole[],
  loginMode?: LoginMode,
  requestedRole?: UserRole,
): UserRole | undefined {
  if (loginMode === "google") {
    return canUseStudentMode(roles) ? "STUDENT" : undefined;
  }

  if (requestedRole && hasRole(roles, requestedRole)) {
    return requestedRole;
  }

  return roles.includes("ADMIN")
    ? "ADMIN"
    : roles.includes("TEACHER")
      ? "TEACHER"
      : undefined;
}

export function resolveRequestRole(
  databaseRoles: readonly UserRole[],
  sessionRole: UserRole,
): UserRole | undefined {
  return hasRole(databaseRoles, sessionRole) ? sessionRole : undefined;
}
