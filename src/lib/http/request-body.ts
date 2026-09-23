import { ApiError } from "./api-error";

export async function readJsonBody(
  request: Request,
  maxBytes = 64 * 1024,
): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new ApiError(413, "REQUEST_TOO_LARGE", "İstek gövdesi izin verilen boyutu aşıyor.");
  }

  if (!request.body) {
    throw new ApiError(400, "INVALID_JSON", "Geçerli bir JSON gövdesi gönderilmelidir.");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new ApiError(413, "REQUEST_TOO_LARGE", "İstek gövdesi izin verilen boyutu aşıyor.");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Geçerli bir JSON gövdesi gönderilmelidir.");
  }
}
