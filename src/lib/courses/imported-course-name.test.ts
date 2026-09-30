import { describe, expect, it } from "vitest";

import { importedCourseName } from "./imported-course-name";

describe("Excel ders adı", () => {
  it("şube kodunu ders adına ekler", () => {
    expect(importedCourseName("Algoritmalar ve Programlama I", "1")).toBe(
      "Algoritmalar ve Programlama I - Şube 1",
    );
    expect(importedCourseName("Algoritmalar ve Programlama I", "2")).toBe(
      "Algoritmalar ve Programlama I - Şube 2",
    );
  });

  it("Şube ifadesiyle gelen kodu normalize eder", () => {
    expect(importedCourseName("Veri Yapıları", "Şube 3")).toBe("Veri Yapıları - Şube 3");
  });

  it("mevcut şube ekini tekrarlamaz", () => {
    expect(importedCourseName("Veri Yapıları - Şube 1", "1")).toBe(
      "Veri Yapıları - Şube 1",
    );
  });

  it("ders adı veya şube yoksa güvenli geri dönüş yapar", () => {
    expect(importedCourseName("  Veri Yapıları  ")).toBe("Veri Yapıları");
    expect(importedCourseName(undefined, "1")).toBeUndefined();
  });
});
