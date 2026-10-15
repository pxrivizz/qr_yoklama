import { describe, expect, it } from "vitest";

import {
  CAMPUS_LOCATION_PRESETS,
  DEFAULT_CAMPUS_LOCATION,
  DEFAULT_CAMPUS_NETWORK_CIDR,
  findCampusLocationPreset,
  googleMapsLocationUrl,
} from "./campus-locations";

describe("campus location presets", () => {
  it("contains only unique, valid, verified location definitions", () => {
    expect(CAMPUS_LOCATION_PRESETS).toHaveLength(9);
    expect(new Set(CAMPUS_LOCATION_PRESETS.map((location) => location.id)).size).toBe(
      CAMPUS_LOCATION_PRESETS.length,
    );

    for (const location of CAMPUS_LOCATION_PRESETS) {
      expect(location.label.length).toBeGreaterThan(2);
      expect(location.latitude).toBeGreaterThanOrEqual(-90);
      expect(location.latitude).toBeLessThanOrEqual(90);
      expect(location.longitude).toBeGreaterThanOrEqual(-180);
      expect(location.longitude).toBeLessThanOrEqual(180);
    }
  });

  it("matches saved coordinates back to their preset", () => {
    expect(
      findCampusLocationPreset(
        DEFAULT_CAMPUS_LOCATION.latitude,
        DEFAULT_CAMPUS_LOCATION.longitude,
      ),
    ).toEqual(DEFAULT_CAMPUS_LOCATION);
    expect(findCampusLocationPreset(0, 0)).toBeUndefined();
  });

  it("builds an official Google Maps URL without requiring an API key", () => {
    expect(googleMapsLocationUrl(37.1614908, 28.3759782)).toBe(
      "https://www.google.com/maps/search/?api=1&query=37.1614908%2C28.3759782",
    );
  });

  it("uses the verified campus network as the shared default", () => {
    expect(DEFAULT_CAMPUS_NETWORK_CIDR).toBe("194.27.153.159/8");
  });
});
