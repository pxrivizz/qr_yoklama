import { describe, expect, it } from "vitest";
import { utils, write } from "xlsx";

import { parseEnrollmentWorkbook, parseEnrollmentWorkbookDetails } from "./excel-parser";

function workbookBytes(
  rows: (string | number)[][],
  bookType: "xlsx" | "biff8" = "xlsx",
): ArrayBuffer {
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, utils.aoa_to_sheet(rows), "Öğrenciler");
  return write(workbook, { type: "array", bookType }) as ArrayBuffer;
}

describe("Excel öğrenci listesi", () => {
  it("ayrı ad ve soyad kolonlarını ve zorunlu değerlerini ayrıştırır", async () => {
    const bytes = workbookBytes([
      ["Ad", "Soyad", "Okul No", "Zorunlu mu?"],
      ["Çağla", "Şengül", "00123", "Evet"],
      ["Ömer", "Işık", "456", "Hayır"],
    ]);

    const rows = await parseEnrollmentWorkbook(bytes);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      fullName: "Çağla Şengül",
      normalizedName: "cagla sengul",
      schoolNumber: "00123",
      isMandatory: true,
      errors: [],
    });
    expect(rows[1]?.isMandatory).toBe(false);
  });

  it("Report.xls düzeninde başlık satırını, ders bilgisini ve öğrencileri bulur", async () => {
    const bytes = workbookBytes(
      [
        [" Sınav Yoklama Listesi"],
        [],
        [
          "Fakülte/Yüksekokul\nProgram\nSınıf\nDers Kodu\nŞube Kodu\nDers Adı\nÖğretim Elemanı",
          "",
          "",
          ":\n:\n:\n:\n:\n:\n:",
          "Teknoloji Fakültesi\nBilişim Sistemleri Mühendisliği\n2\nBSM2022\n1\nVeri Bilimine Giriş\nDr. Öğr. Üyesi Örnek Öğretmen",
        ],
        [],
        ["#", "Öğrenci No", "Adı Soyadı", "", "", "Alış/Ö.Not", "Vize Maz.", "Vize"],
        [1, "171601013", "YELDA AYDEMİR", "", "", "Alttan/FF"],
        [2, "221601045", "GÖKÇE ÖZTÜRK", "", "", "Zorunlu/"],
      ],
      "biff8",
    );

    const workbook = await parseEnrollmentWorkbookDetails(bytes);
    expect(workbook.metadata).toEqual({
      faculty: "Teknoloji Fakültesi",
      program: "Bilişim Sistemleri Mühendisliği",
      classLevel: "2",
      courseCode: "BSM2022",
      branchCode: "1",
      courseName: "Veri Bilimine Giriş",
      instructor: "Dr. Öğr. Üyesi Örnek Öğretmen",
    });
    expect(workbook.rows).toMatchObject([
      {
        rowNumber: 6,
        fullName: "YELDA AYDEMİR",
        schoolNumber: "171601013",
        isMandatory: false,
        rawMandatory: "Alttan/FF",
        errors: [],
      },
      {
        rowNumber: 7,
        fullName: "GÖKÇE ÖZTÜRK",
        schoolNumber: "221601045",
        isMandatory: true,
        rawMandatory: "Zorunlu/",
        errors: [],
      },
    ]);
  });

  it("Alış/Ö.Not sütunundaki İlk, Tekrar, Devamsız/DZ ve boş değerleri doğru yorumlar", async () => {
    const bytes = workbookBytes([
      ["Öğrenci No", "Adı Soyadı", "Alış/Ö.Not"],
      ["101", "Ahmet Yılmaz", "İlk/"],
      ["102", "Mehmet Demir", "İlk Alış"],
      ["103", "Ayşe Kaya", "Tekrar/FF"],
      ["104", "Fatma Çelik", "Tekrar/DZ"],
      ["105", "Ali Koç", "Devamlı"],
      ["106", "Zeynep Şen", "Muaf"],
      ["107", "Can Öz", ""],
      ["108", "Elif Ak", "-"],
    ]);

    const rows = await parseEnrollmentWorkbook(bytes);
    expect(rows).toHaveLength(8);

    // İlk/ -> Zorunlu
    expect(rows[0]).toMatchObject({ schoolNumber: "101", isMandatory: true, rawMandatory: "İlk/" });
    // İlk Alış -> Zorunlu
    expect(rows[1]).toMatchObject({ schoolNumber: "102", isMandatory: true, rawMandatory: "İlk Alış" });
    // Tekrar/FF -> Devam muaf (Alttan)
    expect(rows[2]).toMatchObject({ schoolNumber: "103", isMandatory: false, rawMandatory: "Tekrar/FF" });
    // Tekrar/DZ -> Devamsızlıktan kaldığı için tekrar alırken DEVAM ZORUNLU
    expect(rows[3]).toMatchObject({ schoolNumber: "104", isMandatory: true, rawMandatory: "Tekrar/DZ" });
    // Devamlı -> Devam muaf
    expect(rows[4]).toMatchObject({ schoolNumber: "105", isMandatory: false, rawMandatory: "Devamlı" });
    // Muaf -> Devam muaf
    expect(rows[5]).toMatchObject({ schoolNumber: "106", isMandatory: false, rawMandatory: "Muaf" });
    // Boş / tire -> İlk kayıt kabul edilir (Zorunlu)
    expect(rows[6]).toMatchObject({ schoolNumber: "107", isMandatory: true });
    expect(rows[7]).toMatchObject({ schoolNumber: "108", isMandatory: true });
  });

  it("Alış / Ö.Notu veya Alış Türü gibi başlık varyasyonlarını tanır", async () => {
    const bytes = workbookBytes([
      ["Öğrenci No", "Adı Soyadı", "Alış / Ö.Notu"],
      ["201", "Murat Kara", "Zorunlu"],
      ["202", "Selin Taş", "Alttan"],
    ]);

    const rows = await parseEnrollmentWorkbook(bytes);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.isMandatory).toBe(true);
    expect(rows[1]?.isMandatory).toBe(false);
  });

  it("dosya içi mükerrer numaraları ve hatalı değerleri işaretler", async () => {
    const bytes = workbookBytes([
      ["Ad", "Soyad", "Okul No", "Zorunlu"],
      ["Ali", "Yılmaz", "100", "Belki"],
      ["Ayşe", "Kaya", "100", "Evet"],
    ]);

    const rows = await parseEnrollmentWorkbook(bytes);
    expect(rows[0]?.errors).toContain(
      "Zorunlu alanı Evet/Hayır, Zorunlu veya Alttan olmalıdır.",
    );
    expect(rows.every((row) => row.errors.some((error) => error.includes("birden fazla")))).toBe(true);
  });

  it("zorunlu kolonlardan biri eksikse dosyayı reddeder", async () => {
    const bytes = workbookBytes([
      ["Ad", "Soyad", "Okul No"],
      ["Ali", "Yılmaz", "100"],
    ]);

    await expect(parseEnrollmentWorkbook(bytes)).rejects.toThrow(
      "Gerekli Excel kolonları bulunamadı",
    );
  });

  it.each([
    ["modern .xlsx", "xlsx"],
    ["eski .xls", "biff8"],
  ] as const)("%s dosyasını kabul eder", async (_label, bookType) => {
    const bytes = workbookBytes(
      [
        ["Ad", "Soyad", "Okul No", "Zorunlu"],
        ["Gökçe", "Öztürk", "00123", "Evet"],
      ],
      bookType,
    );

    await expect(parseEnrollmentWorkbook(bytes)).resolves.toMatchObject([
      {
        fullName: "Gökçe Öztürk",
        schoolNumber: "00123",
        isMandatory: true,
        errors: [],
      },
    ]);
  });

  it("uzantısı değiştirilmiş metin dosyasını reddeder", async () => {
    const bytes = new TextEncoder().encode("Ad,Soyad,Okul No,Zorunlu\nAli,Yılmaz,1,Evet").buffer;

    await expect(parseEnrollmentWorkbook(bytes)).rejects.toThrow(
      "Dosya geçerli bir .xls veya .xlsx çalışma kitabı değil.",
    );
  });
});
