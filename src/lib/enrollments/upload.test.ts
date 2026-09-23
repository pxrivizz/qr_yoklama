import { describe, expect, it } from "vitest";

import { readEnrollmentExcelFile } from "./upload";

function uploadRequest(fileName: string) {
  const formData = new FormData();
  formData.set("file", new File([new Uint8Array([1, 2, 3])], fileName));
  return new Request("http://localhost/upload", {
    method: "POST",
    body: formData,
  });
}

describe("Excel dosyası yükleme kuralları", () => {
  it.each(["ogrenciler.xls", "ogrenciler.xlsx", "OGRENCILER.XLS", "OGRENCILER.XLSX"])(
    "%s uzantısını kabul eder",
    async (fileName) => {
      await expect(readEnrollmentExcelFile(uploadRequest(fileName))).resolves.toMatchObject({
        name: fileName,
      });
    },
  );

  it("Excel dışındaki uzantıları reddeder", async () => {
    await expect(readEnrollmentExcelFile(uploadRequest("ogrenciler.csv"))).rejects.toThrow(
      "Yalnızca .xls ve .xlsx dosyaları desteklenir.",
    );
  });
});
