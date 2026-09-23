import XLSX from "xlsx-js-style";

export type StudentExportItem = {
  id: string;
  fullName: string;
  schoolNumber: string;
  isMandatory: boolean;
  matchedUser?: {
    name: string | null;
    email: string | null;
  } | null;
  stats: {
    totalSessions: number;
    attendedCount: number;
    absentCount: number;
    attendanceRate: number;
    isFailed: boolean;
    isAtLimit?: boolean;
    isNearLimit: boolean;
  };
};

export type CourseStudentsExportData = {
  course: {
    id: string;
    name: string;
    code: string;
    mandatoryAlertLimit: number | null;
  };
  students: StudentExportItem[];
  summary: {
    totalStudents: number;
    mandatoryCount: number;
    optionalCount: number;
    matchedCount: number;
    unmatchedCount: number;
    alertCount: number;
  };
};

const thinBorder = {
  top: { style: "thin", color: { rgb: "CBD5E1" } },
  bottom: { style: "thin", color: { rgb: "CBD5E1" } },
  left: { style: "thin", color: { rgb: "CBD5E1" } },
  right: { style: "thin", color: { rgb: "CBD5E1" } },
};

function sanitizeExcelCell<T>(value: T): T | string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      trimmed.startsWith("=") ||
      trimmed.startsWith("+") ||
      trimmed.startsWith("-") ||
      trimmed.startsWith("@")
    ) {
      return `'${value}`;
    }
  }
  return value;
}

export function buildEnrollmentsWorkbook(
  data: CourseStudentsExportData,
  generatedAt = new Date(),
) {
  const headers = [
    "Sıra",
    "Öğrenci No",
    "Adı Soyadı",
    "Devam Statüsü",
    "Sistem Hesabı",
    "E-posta",
    "Katıldığı",
    "Devamsızlık",
    "Katılım Oranı",
    "Durum",
  ];

  const rows = data.students.map((student, index) => [
    index + 1,
    sanitizeExcelCell(student.schoolNumber),
    sanitizeExcelCell(student.fullName),
    student.isMandatory ? "Devam Zorunlu" : "Devam Muaf (Alttan)",
    student.matchedUser ? "Eşleşti" : "Bekleniyor",
    sanitizeExcelCell(student.matchedUser?.email ?? "—"),
    student.stats.attendedCount,
    student.stats.absentCount,
    student.stats.attendanceRate / 100,
    student.stats.isFailed
      ? "Devamsızlıktan Kaldı"
      : student.stats.isAtLimit
        ? "Devamsızlık Sınırında"
      : student.stats.isNearLimit
        ? "Devamsızlık Sınırına Yakın"
        : "Normal",
  ]);

  const formattedDate = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(generatedAt);

  const sheetData = [
    ["ÖĞRENCİ LİSTESİ"],
    ["Ders", `${data.course.code} - ${data.course.name}`],
    ["Liste Tarihi", formattedDate],
    [
      "Özet",
      `Toplam: ${data.summary.totalStudents} Öğrenci | Zorunlu: ${data.summary.mandatoryCount} | Muaf: ${data.summary.optionalCount} | Eşleşen: ${data.summary.matchedCount} | Risk/Uyarı: ${data.summary.alertCount}`,
    ],
    [],
    headers,
    ...rows,
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  const lastColumn = XLSX.utils.encode_col(headers.length - 1);
  const lastRow = Math.max(6, 6 + rows.length);

  worksheet["!merges"] = [XLSX.utils.decode_range(`A1:${lastColumn}1`)];
  worksheet["!autofilter"] = { ref: `A6:${lastColumn}${lastRow}` };
  worksheet["!cols"] = [
    { wch: 8 },
    { wch: 18 },
    { wch: 28 },
    { wch: 22 },
    { wch: 16 },
    { wch: 30 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 24 },
  ];
  worksheet["!rows"] = [
    { hpt: 30 },
    { hpt: 20 },
    { hpt: 20 },
    { hpt: 20 },
    { hpt: 10 },
    { hpt: 26 },
  ];

  if (worksheet.A1) {
    worksheet.A1.s = {
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14, name: "Calibri" },
      fill: { patternType: "solid", fgColor: { rgb: "1E3A8A" } },
      alignment: { vertical: "center", horizontal: "center" },
    };
  }

  for (let r = 1; r <= 3; r += 1) {
    const labelCell = worksheet[XLSX.utils.encode_cell({ r, c: 0 })];
    const valueCell = worksheet[XLSX.utils.encode_cell({ r, c: 1 })];
    if (labelCell) {
      labelCell.s = {
        font: { bold: true, color: { rgb: "475569" }, sz: 10 },
        fill: { patternType: "solid", fgColor: { rgb: "F1F5F9" } },
        alignment: { vertical: "center" },
      };
    }
    if (valueCell) {
      valueCell.s = {
        font: { bold: true, color: { rgb: "0F172A" }, sz: 10 },
        alignment: { vertical: "center" },
      };
    }
  }

  for (let columnIndex = 0; columnIndex < headers.length; columnIndex += 1) {
    const headerCell = worksheet[XLSX.utils.encode_cell({ r: 5, c: columnIndex })];
    if (headerCell) {
      headerCell.s = {
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10, name: "Calibri" },
        fill: { patternType: "solid", fgColor: { rgb: "1E40AF" } },
        alignment: { vertical: "center", horizontal: "center" },
        border: thinBorder,
      };
    }
  }

  for (let rowIndex = 6; rowIndex < 6 + rows.length; rowIndex += 1) {
    const isEven = rowIndex % 2 === 0;
    const defaultRowBg = isEven ? "F8FAFC" : "FFFFFF";

    for (let c = 0; c < headers.length; c += 1) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c })];
      if (!cell) continue;

      let align: "left" | "center" | "right" = "center";
      let cellBg = defaultRowBg;
      let textColor = "1E293B";
      let isBold = false;

      if (c === 1) {
        cell.t = "s";
      } else if (c === 2) {
        align = "left";
        isBold = true;
      } else if (c === 3) {
        const isMandatory = String(cell.v).includes("Zorunlu");
        cellBg = isMandatory ? "EDE9FE" : "F1F5F9";
        textColor = isMandatory ? "6D28D9" : "475569";
        isBold = isMandatory;
      } else if (c === 4) {
        const isMatched = cell.v === "Eşleşti";
        cellBg = isMatched ? "DCFCE7" : "FEF3C7";
        textColor = isMatched ? "15803D" : "B45309";
        isBold = true;
      } else if (c === 5) {
        align = "left";
        textColor = "475569";
      } else if (c === 6) {
        textColor = "15803D";
        isBold = true;
      } else if (c === 7) {
        const absentVal = Number(cell.v);
        textColor = absentVal > 0 ? "B91C1C" : "475569";
        isBold = absentVal > 0;
      } else if (c === 8) {
        cell.z = "0%";
        const rateVal = Number(cell.v);
        cellBg = rateVal >= 0.7 ? "DCFCE7" : "FEE2E2";
        textColor = rateVal >= 0.7 ? "15803D" : "B91C1C";
        isBold = true;
      } else if (c === 9) {
        if (cell.v === "Devamsızlıktan Kaldı") {
          cellBg = "FEE2E2";
          textColor = "B91C1C";
          isBold = true;
        } else if (
          cell.v === "Devamsızlık Sınırında" ||
          cell.v === "Devamsızlık Sınırına Yakın"
        ) {
          cellBg = "FEF3C7";
          textColor = "B45309";
          isBold = true;
        } else {
          textColor = "475569";
        }
      }

      cell.s = {
        font: { bold: isBold, color: { rgb: textColor }, sz: 10, name: "Calibri" },
        fill: { patternType: "solid", fgColor: { rgb: cellBg } },
        alignment: { vertical: "center", horizontal: align },
        border: thinBorder,
      };
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Öğrenci Listesi");
  workbook.Props = {
    Title: `${data.course.code} Öğrenci Listesi`,
    Subject: data.course.name,
    Author: "EduAttend",
    CreatedDate: generatedAt,
  };
  return workbook;
}

export function writeEnrollmentsWorkbook(data: CourseStudentsExportData) {
  return XLSX.write(buildEnrollmentsWorkbook(data), {
    type: "buffer",
    bookType: "xlsx",
    compression: true,
  });
}
