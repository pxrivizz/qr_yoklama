import { read, utils } from "xlsx";

import { ApiError } from "../http/api-error";
import { normalizePersonName } from "../students/name";

const MAX_ENROLLMENT_ROWS = 2_000;
const HEADER_SCAN_LIMIT = 30;

const HEADER_ALIASES = {
  fullName: ["adisoyadi", "adsoyad", "ogrenciadisoyadi", "ogrenciadsoyad"],
  firstName: ["ad", "adi", "isim", "ogrenciadi"],
  lastName: ["soyad", "soyadi", "soyisim", "ogrencisoyadi"],
  schoolNumber: ["okulno", "okulnumarasi", "ogrencino", "ogrencinumarasi", "numara"],
  mandatory: [
    "zorunlu",
    "zorunlumu",
    "zorunluluk",
    "zorunludurumu",
    "alisonot",
    "alisonotu",
    "alisoncekinot",
    "alisoncekinotu",
    "alisonrencinotu",
    "alisogretimnotu",
    "alisnotu",
    "alisdurumu",
    "alisbicimi",
    "alissekli",
    "alisturu",
    "dersalisturu",
    "dersalissekli",
    "dersalisbicimi",
    "dersalis",
    "dersalisonot",
    "dersalisonotu",
    "onot",
    "onotu",
    "oncekinot",
    "oncekinotu",
    "devam",
    "devamdurumu",
    "devamzorunlulugu",
    "devamzorunlumu",
  ],
} as const;

const METADATA_ALIASES = {
  faculty: "fakulteyuksekokul",
  program: "program",
  classLevel: "sinif",
  courseCode: "derskodu",
  branchCode: "subekodu",
  courseName: "dersadi",
  instructor: "ogretimelemani",
} as const;

export type EnrollmentWorkbookMetadata = Partial<
  Record<keyof typeof METADATA_ALIASES, string>
>;

export type ParsedEnrollmentRow = {
  rowNumber: number;
  fullName: string;
  normalizedName: string;
  schoolNumber: string;
  isMandatory: boolean;
  rawMandatory?: string;
  errors: string[];
};

export type ParsedEnrollmentWorkbook = {
  rows: ParsedEnrollmentRow[];
  metadata?: EnrollmentWorkbookMetadata;
};

type EnrollmentColumns = {
  fullName: number;
  firstName: number;
  lastName: number;
  schoolNumber: number;
  mandatory: number;
};

function workbookFormat(bytes: ArrayBuffer): "xls" | "xlsx" | undefined {
  const signature = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 8));
  const isXlsx =
    signature[0] === 0x50 &&
    signature[1] === 0x4b &&
    signature[2] === 0x03 &&
    signature[3] === 0x04;
  const isXls =
    signature[0] === 0xd0 &&
    signature[1] === 0xcf &&
    signature[2] === 0x11 &&
    signature[3] === 0xe0 &&
    signature[4] === 0xa1 &&
    signature[5] === 0xb1 &&
    signature[6] === 0x1a &&
    signature[7] === 0xe1;

  return isXlsx ? "xlsx" : isXls ? "xls" : undefined;
}

function cellText(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function normalizeHeader(value: string): string {
  return normalizePersonName(value).replace(/\s+/g, "");
}

function findColumn(headers: string[], aliases: readonly string[]): number {
  return headers.findIndex((header) => aliases.includes(header));
}

function columnsFor(row: unknown[]): EnrollmentColumns {
  const headers = row.map((value) => normalizeHeader(cellText(value)));
  return {
    fullName: findColumn(headers, HEADER_ALIASES.fullName),
    firstName: findColumn(headers, HEADER_ALIASES.firstName),
    lastName: findColumn(headers, HEADER_ALIASES.lastName),
    schoolNumber: findColumn(headers, HEADER_ALIASES.schoolNumber),
    mandatory: findColumn(headers, HEADER_ALIASES.mandatory),
  };
}

function isHeaderRow(columns: EnrollmentColumns): boolean {
  const hasName = columns.fullName >= 0 || (columns.firstName >= 0 && columns.lastName >= 0);
  return hasName && columns.schoolNumber >= 0 && columns.mandatory >= 0;
}

function splitLines(value: unknown): string[] {
  return cellText(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractMetadata(rows: unknown[][], headerRowIndex: number): EnrollmentWorkbookMetadata | undefined {
  const wanted = new Map<string, keyof EnrollmentWorkbookMetadata>(
    Object.entries(METADATA_ALIASES).map(([key, alias]) => [alias, key as keyof EnrollmentWorkbookMetadata]),
  );

  for (const row of rows.slice(0, headerRowIndex)) {
    for (let labelIndex = 0; labelIndex < row.length; labelIndex += 1) {
      const labels = splitLines(row[labelIndex]);
      const normalizedLabels = labels.map(normalizeHeader);
      if (!normalizedLabels.some((label) => label === METADATA_ALIASES.courseCode)) continue;

      for (let valueIndex = labelIndex + 1; valueIndex < row.length; valueIndex += 1) {
        const values = splitLines(row[valueIndex]);
        if (values.length !== labels.length) continue;
        if (values.every((value) => /^:$/u.test(value))) continue;

        const metadata: EnrollmentWorkbookMetadata = {};
        normalizedLabels.forEach((label, index) => {
          const key = wanted.get(label);
          if (key && values[index]) metadata[key] = values[index];
        });
        if (Object.keys(metadata).length > 0) return metadata;
      }
    }
  }

  return undefined;
}

function parseMandatory(value: string): { value: boolean; error?: string } {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-" || trimmed === "--") {
    // Üniversite yoklama raporlarında ilk alış durumunda not alanı genellikle boştur veya tire içerir; devam zorunludur.
    return { value: true };
  }

  const normalized = normalizePersonName(trimmed);

  // Devamsızlıktan kalan öğrenciler (DZ, Devamsız vb.) tekrar alsalar dahi devam zorunluluğu vardır.
  if (normalized.includes("dz") || normalized.startsWith("devamsiz")) {
    return { value: true };
  }

  // Zorunlu / İlk Alış / Normal kayıt
  if (
    ["evet", "e", "true", "1", "normal", "zorunludur"].includes(normalized) ||
    normalized.startsWith("zorunlu") ||
    normalized.startsWith("ilk") ||
    normalized.startsWith("1 alis") ||
    normalized.startsWith("1alis")
  ) {
    return { value: true };
  }

  // Alttan / Tekrar / Muaf (Devam şartı aranmaz)
  if (
    ["hayir", "h", "false", "0", "zorunlu degil", "muaf", "muafiyet"].includes(normalized) ||
    normalized.startsWith("alttan") ||
    normalized.startsWith("tekrar") ||
    normalized.startsWith("devamli")
  ) {
    return { value: false };
  }

  return {
    value: false,
    error: "Zorunlu alanı Evet/Hayır, Zorunlu veya Alttan olmalıdır.",
  };
}

function validateName(value: string): string[] {
  if (!value) return ["Adı Soyadı alanı boş bırakılamaz."];
  if (value.length > 160) return ["Adı Soyadı en fazla 160 karakter olabilir."];
  if (!/^[\p{L}\p{M} .'-]+$/u.test(value)) {
    return ["Adı Soyadı yalnızca harf, boşluk, nokta, tire ve kesme işareti içerebilir."];
  }
  return [];
}

async function parseWorkbook(bytes: ArrayBuffer): Promise<ParsedEnrollmentWorkbook> {
  if (!workbookFormat(bytes)) {
    throw new ApiError(
      422,
      "INVALID_WORKBOOK",
      "Dosya geçerli bir .xls veya .xlsx çalışma kitabı değil.",
    );
  }

  let workbook;
  try {
    workbook = read(bytes, {
      type: "array",
      cellDates: false,
      dense: true,
    });
  } catch {
    throw new ApiError(
      422,
      "INVALID_WORKBOOK",
      "Excel dosyası okunamadı. Dosyanın bozuk veya parola korumalı olmadığını kontrol edin.",
    );
  }

  const worksheetName = workbook.SheetNames[0];
  const worksheet = worksheetName ? workbook.Sheets[worksheetName] : undefined;

  if (!worksheet) {
    throw new ApiError(422, "EMPTY_WORKBOOK", "Excel dosyasında çalışma sayfası bulunamadı.");
  }

  const sheetRows = utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: true,
  });

  const headerRowIndex = sheetRows
    .slice(0, HEADER_SCAN_LIMIT)
    .findIndex((row) => isHeaderRow(columnsFor(row ?? [])));

  if (headerRowIndex < 0) {
    throw new ApiError(
      422,
      "MISSING_HEADERS",
      "Gerekli Excel kolonları bulunamadı: Adı Soyadı (veya Ad + Soyad), Öğrenci No, Zorunlu/Alış-Ö.Not.",
    );
  }

  const dataRowCount = sheetRows.length - headerRowIndex - 1;
  if (dataRowCount <= 0) {
    throw new ApiError(422, "EMPTY_WORKBOOK", "Excel dosyasında öğrenci satırı bulunamadı.");
  }
  if (dataRowCount > MAX_ENROLLMENT_ROWS) {
    throw new ApiError(
      422,
      "TOO_MANY_ROWS",
      `Tek seferde en fazla ${MAX_ENROLLMENT_ROWS} öğrenci yüklenebilir.`,
    );
  }

  const columns = columnsFor(sheetRows[headerRowIndex] ?? []);
  const rows: ParsedEnrollmentRow[] = [];
  for (let rowIndex = headerRowIndex + 1; rowIndex < sheetRows.length; rowIndex += 1) {
    const row = sheetRows[rowIndex] ?? [];
    if (isHeaderRow(columnsFor(row))) continue;
    const rowNumber = rowIndex + 1;
    const fullName =
      columns.fullName >= 0
        ? cellText(row[columns.fullName])
        : `${cellText(row[columns.firstName])} ${cellText(row[columns.lastName])}`.trim();
    const schoolNumber = cellText(row[columns.schoolNumber]);
    const mandatoryText = cellText(row[columns.mandatory]);

    if (!fullName && !schoolNumber && !mandatoryText) continue;

    const mandatory = parseMandatory(mandatoryText);
    const errors = validateName(fullName);
    if (!schoolNumber) errors.push("Öğrenci No alanı boş bırakılamaz.");
    if (schoolNumber.length > 40) errors.push("Öğrenci No en fazla 40 karakter olabilir.");
    if (schoolNumber && !/^[\p{L}\p{N}._-]+$/u.test(schoolNumber)) {
      errors.push("Öğrenci No yalnızca harf, rakam, nokta, tire ve alt çizgi içerebilir.");
    }
    if (mandatory.error) errors.push(mandatory.error);

    rows.push({
      rowNumber,
      fullName,
      normalizedName: normalizePersonName(fullName),
      schoolNumber,
      isMandatory: mandatory.value,
      rawMandatory: mandatoryText || (mandatory.value ? "Zorunlu" : "Alttan"),
      errors,
    });
  }

  if (rows.length === 0) {
    throw new ApiError(422, "EMPTY_WORKBOOK", "Excel dosyasında öğrenci satırı bulunamadı.");
  }

  const schoolNumberRows = new Map<string, ParsedEnrollmentRow[]>();
  for (const row of rows) {
    if (!row.schoolNumber) continue;
    const duplicates = schoolNumberRows.get(row.schoolNumber) ?? [];
    duplicates.push(row);
    schoolNumberRows.set(row.schoolNumber, duplicates);
  }
  for (const duplicates of schoolNumberRows.values()) {
    if (duplicates.length > 1) {
      for (const row of duplicates) {
        row.errors.push("Aynı Öğrenci No dosyada birden fazla kez kullanılmış.");
      }
    }
  }

  return {
    rows,
    metadata: extractMetadata(sheetRows, headerRowIndex),
  };
}

export async function parseEnrollmentWorkbookDetails(
  bytes: ArrayBuffer,
): Promise<ParsedEnrollmentWorkbook> {
  return parseWorkbook(bytes);
}

export async function parseEnrollmentWorkbook(
  bytes: ArrayBuffer,
): Promise<ParsedEnrollmentRow[]> {
  return (await parseWorkbook(bytes)).rows;
}
