import { describe, expect, it } from "vitest";

import {
  canUseStudentMode,
  resolveRequestRole,
  resolveSessionRole,
} from "./role-policy";

describe("role policy", () => {
  it("lets Halil enter both the admin and student portals", () => {
    const roles = ["ADMIN", "STUDENT"] as const;
    expect(canUseStudentMode(roles)).toBe(true);
    expect(resolveSessionRole(roles, "google")).toBe("STUDENT");
    expect(resolveSessionRole(roles, "credentials", "ADMIN")).toBe("ADMIN");
  });

  it("lets Guncel enter both the admin and teacher portals", () => {
    const roles = ["ADMIN", "TEACHER"] as const;
    expect(resolveSessionRole(roles, "credentials", "ADMIN")).toBe("ADMIN");
    expect(resolveSessionRole(roles, "credentials", "TEACHER")).toBe("TEACHER");
    expect(resolveSessionRole(roles, "google")).toBeUndefined();
  });

  it("rejects a session role that was removed in the database", () => {
    expect(resolveRequestRole(["ADMIN", "STUDENT"], "STUDENT")).toBe("STUDENT");
    expect(resolveRequestRole(["ADMIN"], "STUDENT")).toBeUndefined();
  });
});
