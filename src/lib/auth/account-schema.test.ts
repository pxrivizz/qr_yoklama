import { describe, expect, it } from "vitest";

import {
  changePasswordSchema,
  createTeacherSchema,
  deleteTeacherSchema,
} from "./account-schema";

describe("teacher account schemas", () => {
  it("requires a strong temporary password when creating a teacher", () => {
    expect(createTeacherSchema.safeParse({
      name: "Ayşe Öğretmen",
      email: "ayse@mu.edu.tr",
      temporaryPassword: "GucluSifre10",
    }).success).toBe(true);
    expect(createTeacherSchema.safeParse({
      name: "Ayşe Öğretmen",
      email: "ayse@mu.edu.tr",
      temporaryPassword: "zayif",
    }).success).toBe(false);
  });

  it("requires matching, different new passwords", () => {
    expect(changePasswordSchema.safeParse({
      currentPassword: "EskiSifre10",
      newPassword: "YeniSifre20",
      confirmPassword: "YeniSifre20",
    }).success).toBe(true);
    expect(changePasswordSchema.safeParse({
      currentPassword: "EskiSifre10",
      newPassword: "YeniSifre20",
      confirmPassword: "BaskaSifre30",
    }).success).toBe(false);
  });

  it("normalizes the delete confirmation email", () => {
    const result = deleteTeacherSchema.parse({ confirmationEmail: "  AYSE@MU.EDU.TR " });
    expect(result.confirmationEmail).toBe("ayse@mu.edu.tr");
  });
});
