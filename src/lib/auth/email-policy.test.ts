import { describe, expect, it } from "vitest";

import {
  isAllowedInstitutionalEmail,
  isAllowedTeacherEmail,
  isStudentEmail,
  resolveInstitutionalRole,
} from "./email-policy";

const allowList = {
  domains: "mu.edu.tr",
  emails: "ozel@misafir.edu.tr",
};

describe("institutional email policy", () => {
  it("accepts only the exact student domain", () => {
    expect(isStudentEmail("ogrenci@posta.mu.edu.tr")).toBe(true);
    expect(isStudentEmail("ogrenci@evilposta.mu.edu.tr")).toBe(false);
  });

  it("requires teachers to be explicitly allowed by domain or address", () => {
    expect(isAllowedTeacherEmail("hoca@mu.edu.tr", allowList)).toBe(true);
    expect(isAllowedTeacherEmail("ozel@misafir.edu.tr", allowList)).toBe(true);
    expect(isAllowedTeacherEmail("hoca@gmail.com", allowList)).toBe(false);
  });

  it("rejects non-institutional Google accounts and resolves roles deterministically", () => {
    expect(isAllowedInstitutionalEmail("ogrenci@posta.mu.edu.tr", allowList)).toBe(true);
    expect(isAllowedInstitutionalEmail("kisi@gmail.com", allowList)).toBe(false);
    expect(resolveInstitutionalRole("hoca@mu.edu.tr", allowList)).toBe("TEACHER");
    expect(resolveInstitutionalRole("ogrenci@posta.mu.edu.tr", allowList)).toBe("STUDENT");
  });
});
