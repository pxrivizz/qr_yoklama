import { createHmac, randomBytes } from "node:crypto";

export const ATTENDANCE_DEVICE_COOKIE_NAME = "qr_attendance_device";
export const ATTENDANCE_DEVICE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export type AttendanceDeviceIdentity = {
  id: string;
  isNew: boolean;
};

export function isValidAttendanceDeviceId(value: string | undefined): value is string {
  return typeof value === "string" && DEVICE_ID_PATTERN.test(value);
}

export function createAttendanceDeviceId(): string {
  return randomBytes(32).toString("base64url");
}

function readCookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;

  for (const part of cookieHeader.split(";")) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex === -1) continue;

    const cookieName = part.slice(0, separatorIndex).trim();
    if (cookieName !== name) continue;

    const rawValue = part.slice(separatorIndex + 1).trim();
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return undefined;
    }
  }

  return undefined;
}

export function resolveAttendanceDeviceIdentity(request: Request): AttendanceDeviceIdentity {
  const existingId = readCookieValue(
    request.headers.get("cookie"),
    ATTENDANCE_DEVICE_COOKIE_NAME,
  );

  if (isValidAttendanceDeviceId(existingId)) {
    return { id: existingId, isNew: false };
  }

  return { id: createAttendanceDeviceId(), isNew: true };
}

export function createAttendanceDeviceCookie(
  deviceId: string,
  secure = process.env.NODE_ENV === "production",
): string {
  if (!isValidAttendanceDeviceId(deviceId)) {
    throw new Error("Geçersiz yoklama cihaz kimliği.");
  }

  const attributes = [
    `${ATTENDANCE_DEVICE_COOKIE_NAME}=${deviceId}`,
    "Path=/",
    `Max-Age=${ATTENDANCE_DEVICE_COOKIE_MAX_AGE_SECONDS}`,
    "HttpOnly",
    "SameSite=Strict",
    "Priority=High",
  ];

  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}

export function attachAttendanceDeviceCookie(
  response: Response,
  identity: AttendanceDeviceIdentity,
): Response {
  if (identity.isNew) {
    response.headers.append("Set-Cookie", createAttendanceDeviceCookie(identity.id));
  }
  return response;
}

export function deriveSessionDeviceFingerprint(
  deviceId: string,
  sessionId: string,
  secret: string,
): string {
  if (!isValidAttendanceDeviceId(deviceId)) {
    throw new Error("Geçersiz yoklama cihaz kimliği.");
  }
  if (!sessionId) {
    throw new Error("Yoklama oturumu kimliği boş olamaz.");
  }
  if (secret.length < 32) {
    throw new Error("Cihaz parmak izi anahtarı en az 32 karakter olmalıdır.");
  }

  return createHmac("sha256", secret)
    .update("attendance-device:v1\0")
    .update(sessionId)
    .update("\0")
    .update(deviceId)
    .digest("hex");
}
