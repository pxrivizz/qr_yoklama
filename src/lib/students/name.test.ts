import { describe, expect, it } from "vitest";

import { arePersonNamesCompatible, normalizePersonName } from "./name";

describe("normalizePersonName", () => {
  it("normalizes Turkish characters, casing, and repeated whitespace", () => {
    expect(normalizePersonName("  ÇAĞLA   ŞENGÜL ")).toBe("cagla sengul");
  });
});

describe("arePersonNamesCompatible", () => {
  it("accepts the same normalized full name", () => {
    expect(arePersonNamesCompatible("Esat Hamza Uslu", "ESAT HAMZA USLU")).toBe(true);
  });

  it("accepts an ordered multi-token Google name missing a roster token", () => {
    expect(arePersonNamesCompatible("Esat Hamza", "ESAT HAMZA USLU")).toBe(true);
    expect(arePersonNamesCompatible("Esat Uslu", "ESAT HAMZA USLU")).toBe(true);
  });

  it("accepts a roster name missing one of the Google profile names", () => {
    expect(arePersonNamesCompatible("Esat Hamza Uslu", "ESAT USLU")).toBe(true);
  });

  it("accepts surname-first and otherwise reordered roster names", () => {
    expect(arePersonNamesCompatible("Esat Hamza Uslu", "USLU ESAT HAMZA")).toBe(true);
    expect(arePersonNamesCompatible("Ahmet Can Kaya", "KAYA AHMET")).toBe(true);
  });

  it("accepts initials and spacing differences without requiring fuzzy spelling", () => {
    expect(arePersonNamesCompatible("Ayşe N. Yılmaz", "AYŞE NUR YILMAZ")).toBe(true);
    expect(arePersonNamesCompatible("Nurselin Kaya", "NUR SELİN KAYA")).toBe(true);
    expect(arePersonNamesCompatible("A. Ali Kaya", "ALİ AHMET KAYA")).toBe(true);
  });

  it("rejects one-word and conflicting names", () => {
    expect(arePersonNamesCompatible("Esat", "ESAT HAMZA USLU")).toBe(false);
    expect(arePersonNamesCompatible("Esat Mehmet", "ESAT HAMZA USLU")).toBe(false);
    expect(arePersonNamesCompatible("Esat Hamza", "ESAT Mehmet")).toBe(false);
  });

  it("does not reuse a duplicate token as two separate matches", () => {
    expect(arePersonNamesCompatible("Ali Ali Kaya", "Ali Can Kaya")).toBe(false);
  });
});
