import XLSX from "xlsx-js-style";

import type { AttendanceStatus } from "@/generated/prisma/enums";
import type { CourseAttendanceReport } from "@/lib/attendance/report-service";

const statusLabels: Record<AttendanceStatus, string> = {
  PRESENT: "Var",
  ABSENT: "Yok",
  LATE: "Geç",
  EXCUSED: "Mazeretli",
  FLAGGED: "İncelemede",
};

function sessionColumnLabel(session: CourseAttendanceReport["sessions"][number]) {
  const day = String(session.startedAt.getDate()).padStart(2, "0");
  const month = String(session.startedAt.getMonth() + 1).padStart(2, "0");
  return `H${session.weekNumber}.O${session.sessionIndexInWeek} (${day}.${month})`;
}

const thinBorder = {
  top: { style: "thin", color: { rgb: "E2E8F0" } },
  bottom: { style: "thin", color: { rgb: "E2E8F0" } },
  left: { style: "thin", color: { rgb: "E2E8F0" } },
  right: { style: "thin", color: { rgb: "E2E8F0" } },
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

export function buildAttendanceWorkbook(
  report: CourseAttendanceReport,
  generatedAt = new Date(),
) {
  const sessionHeaders = report.sessions.map(sessionColumnLabel);
  const headers = [
    "Öğrenci",
    "Öğrenci No",
    "Zorunlu",
    ...sessionHeaders,
    "Var",
    "Yok",
    "Katılım Oranı",
  ];

  const rows = report.rows.map((row) => [
    sanitizeExcelCell(row.fullNameOnList),
    sanitizeExcelCell(row.schoolNumberOnList),
    row.isMandatory ? "Evet" : "-",
    ...row.statuses.map((status) => statusLabels[status]),
    row.presentCount,
    row.absentCount,
    row.attendanceRate / 100,
  ]);

  const formattedDate = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(generatedAt);

  const data = [
    ["YOKLAMA RAPORU"],
    ["Ders", `${report.course.code} - ${report.course.name}`],
    ["Rapor Tarihi", formattedDate],
    [
      "Özet",
      `${report.summary.sessionCount} Oturum | ${report.summary.studentCount} Öğrenci | Ortalama Katılım: %${report.summary.averageAttendanceRate}`,
    ],
    [],
    headers,
    ...rows,
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data, { cellDates: true });
  const lastColumn = XLSX.utils.encode_col(headers.length - 1);
  const lastRow = Math.max(6, 6 + rows.length);
  worksheet["!merges"] = [XLSX.utils.decode_range(`A1:${lastColumn}1`)];
  worksheet["!autofilter"] = { ref: `A6:${lastColumn}${lastRow}` };
  worksheet["!cols"] = [
    { wch: 26 },
    { wch: 15 },
    { wch: 10 },
    ...report.sessions.map(() => ({ wch: 14 })),
    { wch: 8 },
    { wch: 8 },
    { wch: 16 },
  ];
  worksheet["!rows"] = [{ hpt: 28 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, { hpt: 10 }, { hpt: 26 }];

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

  const sessionStartIndex = 3;
  const sessionEndIndex = sessionStartIndex + sessionHeaders.length - 1;

  for (let columnIndex = 0; columnIndex < headers.length; columnIndex += 1) {
    const headerCell = worksheet[XLSX.utils.encode_cell({ r: 5, c: columnIndex })];
    if (headerCell) {
      let headerBg = "1E40AF";

      if (columnIndex === headers.length - 3) {
        headerBg = "15803D";
      } else if (columnIndex === headers.length - 2) {
        headerBg = "B91C1C";
      } else if (columnIndex === headers.length - 1) {
        headerBg = "1E3A8A";
      }

      headerCell.s = {
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10, name: "Calibri" },
        fill: { patternType: "solid", fgColor: { rgb: headerBg } },
        alignment: { vertical: "center", horizontal: "center", wrapText: true },
        border: thinBorder,
      };
    }
  }

  const attendanceRateColumn = headers.length - 1;
  const varCol = headers.length - 3;
  const yokCol = headers.length - 2;

  for (let rowIndex = 6; rowIndex < 6 + rows.length; rowIndex += 1) {
    const isEven = rowIndex % 2 === 0;
    const defaultRowBg = isEven ? "F8FAFC" : "FFFFFF";

    const nameCell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: 0 })];
    if (nameCell) {
      nameCell.s = {
        font: { bold: true, color: { rgb: "1E293B" }, sz: 10 },
        fill: { patternType: "solid", fgColor: { rgb: defaultRowBg } },
        alignment: { vertical: "center", horizontal: "left" },
        border: thinBorder,
      };
    }

    const noCell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: 1 })];
    if (noCell) {
      noCell.t = "s";
      noCell.s = {
        font: { color: { rgb: "475569" }, sz: 10 },
        fill: { patternType: "solid", fgColor: { rgb: defaultRowBg } },
        alignment: { vertical: "center", horizontal: "center" },
        border: thinBorder,
      };
    }

    const zorunluCell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: 2 })];
    if (zorunluCell) {
      const isZorunlu = zorunluCell.v === "Evet";
      zorunluCell.s = {
        font: { bold: isZorunlu, color: { rgb: isZorunlu ? "7C3AED" : "94A3B8" }, sz: 10 },
        fill: { patternType: "solid", fgColor: { rgb: isZorunlu ? "EDE9FE" : defaultRowBg } },
        alignment: { vertical: "center", horizontal: "center" },
        border: thinBorder,
      };
    }

    for (let c = sessionStartIndex; c <= sessionEndIndex; c += 1) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c })];
      if (cell) {
        const val = String(cell.v);
        let cellBg = defaultRowBg;
        let cellColor = "475569";
        let isBold = false;

        if (val === "Var") {
          cellBg = "DCFCE7";
          cellColor = "15803D";
          isBold = true;
        } else if (val === "Yok") {
          cellBg = "FEE2E2";
          cellColor = "B91C1C";
          isBold = true;
        } else if (val === "Mazeretli") {
          cellBg = "DBEAFE";
          cellColor = "1D4ED8";
          isBold = true;
        }

        cell.s = {
          font: { bold: isBold, color: { rgb: cellColor }, sz: 10 },
          fill: { patternType: "solid", fgColor: { rgb: cellBg } },
          alignment: { vertical: "center", horizontal: "center" },
          border: thinBorder,
        };
      }
    }

    const varCell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: varCol })];
    if (varCell) {
      varCell.s = {
        font: { bold: true, color: { rgb: "15803D" }, sz: 10 },
        fill: { patternType: "solid", fgColor: { rgb: defaultRowBg } },
        alignment: { vertical: "center", horizontal: "center" },
        border: thinBorder,
      };
    }

    const yokCell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: yokCol })];
    if (yokCell) {
      yokCell.s = {
        font: { bold: Number(yokCell.v) > 0, color: { rgb: Number(yokCell.v) > 0 ? "B91C1C" : "94A3B8" }, sz: 10 },
        fill: { patternType: "solid", fgColor: { rgb: defaultRowBg } },
        alignment: { vertical: "center", horizontal: "center" },
        border: thinBorder,
      };
    }

    const rateCell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: attendanceRateColumn })];
    if (rateCell) {
      rateCell.z = "0%";
      const rateVal = Number(rateCell.v);
      const isGood = rateVal >= 0.7;
      rateCell.s = {
        font: { bold: true, color: { rgb: isGood ? "15803D" : "B91C1C" }, sz: 10 },
        fill: { patternType: "solid", fgColor: { rgb: isGood ? "DCFCE7" : "FEE2E2" } },
        alignment: { vertical: "center", horizontal: "center" },
        border: thinBorder,
      };
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Yoklama Raporu");
  workbook.Props = {
    Title: `${report.course.code} Yoklama Raporu`,
    Subject: report.course.name,
    Author: "EduAttend",
    CreatedDate: generatedAt,
  };
  return workbook;
}

export function writeAttendanceWorkbook(report: CourseAttendanceReport) {
  return XLSX.write(buildAttendanceWorkbook(report), {
    type: "buffer",
    bookType: "xlsx",
    compression: true,
  });
}
