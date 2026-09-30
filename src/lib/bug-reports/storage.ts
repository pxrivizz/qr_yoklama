import "server-only";

import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { ApiError } from "@/lib/http/api-error";

const MAX_SCREENSHOT_BYTES = 6 * 1024 * 1024;

const imageTypes = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

export function bugReportStorageDirectory() {
  return process.env.BUG_REPORT_STORAGE_DIR?.trim() || path.join(process.cwd(), "storage", "bug-reports");
}

function hasValidSignature(bytes: Uint8Array, mimeType: keyof typeof imageTypes) {
  if (mimeType === "image/png") {
    return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, i) => bytes[i] === byte);
  }
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  return (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  );
}

export async function saveBugScreenshot(file: File) {
  if (!(file.type in imageTypes)) {
    throw new ApiError(415, "UNSUPPORTED_SCREENSHOT", "Ekran görüntüsü PNG, JPEG veya WebP olmalıdır.");
  }
  if (file.size <= 0 || file.size > MAX_SCREENSHOT_BYTES) {
    throw new ApiError(413, "SCREENSHOT_TOO_LARGE", "Ekran görüntüsü 6 MB'dan küçük olmalıdır.");
  }

  const mimeType = file.type as keyof typeof imageTypes;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasValidSignature(bytes, mimeType)) {
    throw new ApiError(422, "INVALID_SCREENSHOT", "Yüklenen dosya geçerli bir ekran görüntüsü değil.");
  }

  const fileName = `${randomUUID()}.${imageTypes[mimeType]}`;
  const directory = bugReportStorageDirectory();
  await mkdir(directory, { recursive: true, mode: 0o750 });
  await writeFile(path.join(/* turbopackIgnore: true */ directory, fileName), bytes, { mode: 0o640 });
  return { fileName, mimeType };
}

export async function removeBugScreenshot(fileName: string) {
  await unlink(
    path.join(/* turbopackIgnore: true */ bugReportStorageDirectory(), path.basename(fileName)),
  ).catch(() => undefined);
}

export async function readBugScreenshot(fileName: string) {
  return readFile(
    path.join(/* turbopackIgnore: true */ bugReportStorageDirectory(), path.basename(fileName)),
  );
}
