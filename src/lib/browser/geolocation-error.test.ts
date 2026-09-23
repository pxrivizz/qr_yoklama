import { describe, expect, it } from "vitest";

import { geolocationErrorMessage } from "./geolocation-error";

describe("konum izin hataları", () => {
  it.each([
    [1, "Konum izni verilmedi"],
    [2, "Telefon konumunuzu belirleyemedi"],
    [3, "Konum alınırken süre doldu"],
  ])("%s kodu için eyleme dönük mesaj üretir", (code, expected) => {
    expect(geolocationErrorMessage({ code })).toContain(expected);
  });

  it("bilinmeyen hatada genel yönlendirme gösterir", () => {
    expect(geolocationErrorMessage(new Error("unknown"))).toContain("site iznini");
  });
});
