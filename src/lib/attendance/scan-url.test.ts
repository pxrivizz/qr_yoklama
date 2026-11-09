import { describe, expect, it } from "vitest";

import { buildAttendanceScanUrl } from "./scan-url";

describe("buildAttendanceScanUrl", () => {
  it("QR bağlantısına token ve ders kimliğini birlikte ekler", () => {
    expect(
      buildAttendanceScanUrl(
        "https://dersdevam.com.tr",
        "header.payload.signature",
        "course-123",
      ),
    ).toBe(
      "https://dersdevam.com.tr/tara?token=header.payload.signature&courseId=course-123",
    );
  });

  it("özel karakterleri güvenli biçimde kodlar", () => {
    expect(
      buildAttendanceScanUrl("https://dersdevam.com.tr/", "a+b/c", "ders şube 1"),
    ).toBe(
      "https://dersdevam.com.tr/tara?token=a%2Bb%2Fc&courseId=ders+%C5%9Fube+1",
    );
  });
});
