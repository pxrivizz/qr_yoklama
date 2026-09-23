import { ApiError } from "../http/api-error";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export async function readEnrollmentExcelFile(request: Request): Promise<File> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_FILE_SIZE_BYTES + 100_000) {
    throw new ApiError(413, "FILE_TOO_LARGE", "Excel dosyası en fazla 5 MB olabilir.");
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new ApiError(422, "FILE_REQUIRED", "Bir Excel dosyası seçmelisiniz.");
  }
  if (file.size === 0) {
    throw new ApiError(422, "EMPTY_FILE", "Seçilen dosya boş.");
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ApiError(413, "FILE_TOO_LARGE", "Excel dosyası en fazla 5 MB olabilir.");
  }
  const lowerName = file.name.toLocaleLowerCase("tr-TR");
  if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".xls")) {
    throw new ApiError(415, "UNSUPPORTED_FILE", "Yalnızca .xls ve .xlsx dosyaları desteklenir.");
  }

  return file;
}
