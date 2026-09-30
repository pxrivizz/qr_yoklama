import { describe, expect, it } from "vitest";

import { googleProfileName } from "./google-profile";

describe("googleProfileName", () => {
  it("prefers Google's structured given and family names", () => {
    expect(
      googleProfileName({
        name: "Esat Hamza",
        given_name: "Esat Hamza",
        family_name: "Uslu",
      }),
    ).toBe("Esat Hamza Uslu");
  });

  it("falls back to the display name when structured fields are incomplete", () => {
    expect(googleProfileName({ name: "Esat Hamza Uslu", given_name: "Esat Hamza" })).toBe(
      "Esat Hamza Uslu",
    );
  });

  it("uses whichever Google representation preserves more name parts", () => {
    expect(
      googleProfileName({
        name: "Esat Uslu",
        given_name: "Esat Hamza",
        family_name: "Uslu",
      }),
    ).toBe("Esat Hamza Uslu");
  });
});
