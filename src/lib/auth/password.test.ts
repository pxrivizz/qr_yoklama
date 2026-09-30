import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { hashPassword, verifyPassword } from "./password";

describe("teacher password hashing", () => {
  it("stores a salted hash and verifies only the original password", async () => {
    const first = await hashPassword("GucluSifre10");
    const second = await hashPassword("GucluSifre10");

    expect(first).not.toBe(second);
    expect(first).not.toContain("GucluSifre10");
    await expect(verifyPassword("GucluSifre10", first)).resolves.toBe(true);
    await expect(verifyPassword("YanlisSifre10", first)).resolves.toBe(false);
  });

  it("rejects malformed hashes", async () => {
    await expect(verifyPassword("GucluSifre10", "invalid")).resolves.toBe(false);
  });
});
