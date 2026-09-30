import { describe, expect, it } from "vitest";

import {
  bugReportFieldsSchema,
  bugReportListSchema,
  bugReportResponseSchema,
  bugReportStatusSchema,
} from "./schema";

describe("bug report schemas", () => {
  it("normalizes a valid report", () => {
    expect(
      bugReportFieldsSchema.parse({
        subject: "  QR ekranı yenileniyor  ",
        description: "  Başarılı mesajından sonra tarayıcı tekrar açılıyor.  ",
        pageUrl: "/tara",
      }),
    ).toEqual({
      subject: "QR ekranı yenileniyor",
      description: "Başarılı mesajından sonra tarayıcı tekrar açılıyor.",
      pageUrl: "/tara",
    });
  });

  it("rejects reports without enough diagnostic detail", () => {
    expect(() =>
      bugReportFieldsSchema.parse({ subject: "Hata", description: "Olmadı" }),
    ).toThrow();
  });

  it("caps list pagination and rejects unknown states", () => {
    expect(bugReportListSchema.parse({}).pageSize).toBe(20);
    expect(bugReportListSchema.parse({ status: "IN_PROGRESS" }).status).toBe("IN_PROGRESS");
    expect(() => bugReportListSchema.parse({ pageSize: 51 })).toThrow();
    expect(() => bugReportListSchema.parse({ status: "HACKED" })).toThrow();
  });

  it("validates manual workflow updates and trims responses", () => {
    expect(bugReportStatusSchema.parse({ status: "FIXED" })).toEqual({ status: "FIXED" });
    expect(bugReportResponseSchema.parse({ message: "  Sorun giderildi.  " })).toEqual({
      message: "Sorun giderildi.",
    });
    expect(() => bugReportResponseSchema.parse({ message: " " })).toThrow();
  });
});
