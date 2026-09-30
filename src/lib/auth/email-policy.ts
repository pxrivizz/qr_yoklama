import type { UserRole } from "@/generated/prisma/enums";

const studentEmailDomain = "posta.mu.edu.tr";

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

function emailDomain(email: string) {
  return email.split("@")[1] ?? "";
}

function teacherAllowList(input: { domains?: string; emails?: string }) {
  return [input.domains, input.emails]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((entry) => entry.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
}

export function isStudentEmail(email: string | null | undefined) {
  const normalizedEmail = normalizeEmail(email);
  return Boolean(normalizedEmail) && emailDomain(normalizedEmail) === studentEmailDomain;
}

export function isAllowedTeacherEmail(
  email: string | null | undefined,
  allowList: { domains?: string; emails?: string },
) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;
  const domain = emailDomain(normalizedEmail);

  return teacherAllowList(allowList).some((entry) =>
    entry.includes("@") ? normalizedEmail === entry : domain === entry,
  );
}

export function isAllowedInstitutionalEmail(
  email: string | null | undefined,
  allowList: { domains?: string; emails?: string },
) {
  return isStudentEmail(email) || isAllowedTeacherEmail(email, allowList);
}

export function resolveInstitutionalRole(
  email: string | null | undefined,
  allowList: { domains?: string; emails?: string },
): UserRole {
  return isAllowedTeacherEmail(email, allowList) ? "TEACHER" : "STUDENT";
}
