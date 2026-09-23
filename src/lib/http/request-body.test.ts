import { describe, expect, it } from "vitest";

import { readJsonBody } from "./request-body";

describe("sınırlı JSON gövdesi", () => {
  it("geçerli JSON gövdesini okur", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      body: JSON.stringify({ ok: true }),
    });
    await expect(readJsonBody(request)).resolves.toEqual({ ok: true });
  });

  it("bildirilen veya gerçek boyut sınırını aşan gövdeyi reddeder", async () => {
    const declared = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-length": "1000" },
      body: "{}",
    });
    await expect(readJsonBody(declared, 10)).rejects.toMatchObject({ status: 413 });

    const actual = new Request("http://localhost/api", {
      method: "POST",
      body: JSON.stringify({ value: "x".repeat(100) }),
    });
    await expect(readJsonBody(actual, 10)).rejects.toMatchObject({ status: 413 });
  });

  it("bozuk JSON'u güvenli istemci hatasına dönüştürür", async () => {
    const request = new Request("http://localhost/api", { method: "POST", body: "{" });
    await expect(readJsonBody(request)).rejects.toMatchObject({
      status: 400,
      code: "INVALID_JSON",
    });
  });
});
