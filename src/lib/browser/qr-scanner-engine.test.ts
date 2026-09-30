import { describe, expect, it } from "vitest";
import { extractTokenFromQrRaw } from "./qr-scanner-engine";

describe("extractTokenFromQrRaw", () => {
  it("extracts token query parameter from full URL", () => {
    const url = "https://okul-yoklama.edu.tr/tara?token=eyJhbGciOiJIUzI1NiJ9.test.sig";
    expect(extractTokenFromQrRaw(url)).toBe("eyJhbGciOiJIUzI1NiJ9.test.sig");
  });

  it("extracts token from localhost URL", () => {
    const url = "http://localhost:3000/tara?token=my-secret-token";
    expect(extractTokenFromQrRaw(url)).toBe("my-secret-token");
  });

  it("handles relative URL with token param", () => {
    const url = "/tara?token=sample-token-123";
    expect(extractTokenFromQrRaw(url)).toBe("sample-token-123");
  });

  it("extracts raw 3-part JWT if passed directly without URL", () => {
    const jwt = "header.payload.signature";
    expect(extractTokenFromQrRaw(jwt)).toBe("header.payload.signature");
  });

  it("returns empty string for invalid raw values", () => {
    expect(extractTokenFromQrRaw("")).toBe("");
    expect(extractTokenFromQrRaw("   ")).toBe("");
    expect(extractTokenFromQrRaw("hello world")).toBe("");
    expect(extractTokenFromQrRaw("https://google.com/search?q=test")).toBe("");
  });
});
