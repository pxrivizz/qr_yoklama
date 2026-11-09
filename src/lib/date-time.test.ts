import { describe, expect, it } from "vitest";

import { formatTurkeyDateTime } from "@/lib/date-time";

describe("formatTurkeyDateTime", () => {
  it("UTC zamanını Türkiye saatine çevirir", () => {
    expect(formatTurkeyDateTime("2026-11-08T20:42:00.000Z")).toBe("08 Kas 23:42");
  });
});
