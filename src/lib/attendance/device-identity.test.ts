import { describe, expect, it } from "vitest";

import {
  ATTENDANCE_DEVICE_COOKIE_NAME,
  attachAttendanceDeviceCookie,
  createAttendanceDeviceCookie,
  createAttendanceDeviceId,
  deriveSessionDeviceFingerprint,
  isValidAttendanceDeviceId,
  resolveAttendanceDeviceIdentity,
} from "@/lib/attendance/device-identity";

const secret = "test-only-device-fingerprint-secret-123456789";

describe("attendance device identity", () => {
  it("creates a cryptographically random 256-bit browser identity", () => {
    const first = createAttendanceDeviceId();
    const second = createAttendanceDeviceId();

    expect(first).toHaveLength(43);
    expect(isValidAttendanceDeviceId(first)).toBe(true);
    expect(first).not.toBe(second);
  });

  it("reuses a valid device cookie and replaces an invalid one", () => {
    const existingId = createAttendanceDeviceId();
    const existingRequest = new Request("https://example.test/api/attendance/scan", {
      headers: { cookie: `theme=dark; ${ATTENDANCE_DEVICE_COOKIE_NAME}=${existingId}` },
    });
    const invalidRequest = new Request("https://example.test/api/attendance/scan", {
      headers: { cookie: `${ATTENDANCE_DEVICE_COOKIE_NAME}=tampered` },
    });

    expect(resolveAttendanceDeviceIdentity(existingRequest)).toEqual({
      id: existingId,
      isNew: false,
    });
    const replacement = resolveAttendanceDeviceIdentity(invalidRequest);
    expect(replacement.isNew).toBe(true);
    expect(isValidAttendanceDeviceId(replacement.id)).toBe(true);
  });

  it("sets a hardened HttpOnly cookie only for new identities", () => {
    const deviceId = createAttendanceDeviceId();
    const serialized = createAttendanceDeviceCookie(deviceId, true);

    expect(serialized).toContain(`${ATTENDANCE_DEVICE_COOKIE_NAME}=${deviceId}`);
    expect(serialized).toContain("HttpOnly");
    expect(serialized).toContain("SameSite=Strict");
    expect(serialized).toContain("Secure");
    expect(serialized).toContain("Path=/");

    const response = attachAttendanceDeviceCookie(Response.json({ ok: true }), {
      id: deviceId,
      isNew: true,
    });
    expect(response.headers.get("set-cookie")).toContain(deviceId);

    const unchanged = attachAttendanceDeviceCookie(Response.json({ ok: true }), {
      id: deviceId,
      isNew: false,
    });
    expect(unchanged.headers.has("set-cookie")).toBe(false);
  });

  it("creates the same fingerprint only for the same device and session", () => {
    const deviceId = createAttendanceDeviceId();
    const same = deriveSessionDeviceFingerprint(deviceId, "session-1", secret);

    expect(same).toMatch(/^[a-f0-9]{64}$/);
    expect(deriveSessionDeviceFingerprint(deviceId, "session-1", secret)).toBe(same);
    expect(deriveSessionDeviceFingerprint(deviceId, "session-2", secret)).not.toBe(same);
    expect(
      deriveSessionDeviceFingerprint(createAttendanceDeviceId(), "session-1", secret),
    ).not.toBe(same);
  });
});
