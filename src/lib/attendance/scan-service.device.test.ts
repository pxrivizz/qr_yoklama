import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  qrTokenFindUnique: vi.fn(),
  enrollmentFindFirst: vi.fn(),
  attendanceRecordFindUnique: vi.fn(),
  attendanceRecordFindFirst: vi.fn(),
  attendanceAttemptCreate: vi.fn(),
  transaction: vi.fn(),
  transactionRecordCreate: vi.fn(),
  transactionAttemptCreate: vi.fn(),
  verifyQrToken: vi.fn(),
  createQrScanLog: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    qrToken: { findUnique: mocks.qrTokenFindUnique },
    enrollment: { findFirst: mocks.enrollmentFindFirst },
    attendanceRecord: {
      findUnique: mocks.attendanceRecordFindUnique,
      findFirst: mocks.attendanceRecordFindFirst,
    },
    attendanceAttempt: { create: mocks.attendanceAttemptCreate },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({
    QR_SIGNING_SECRET: "test-only-qr-signing-secret-123456789",
    AUTH_SECRET: "test-only-auth-secret-for-device-hmac-123456789",
  }),
}));

vi.mock("@/lib/attendance/qr-token", () => ({
  verifyQrToken: mocks.verifyQrToken,
}));

vi.mock("@/lib/attendance/qr-log-service", () => ({
  createQrScanLog: mocks.createQrScanLog,
}));

vi.mock("@/lib/attendance/geo", () => ({
  isWithinAllowedRadius: () => ({ allowed: true, distanceMeters: 12 }),
}));

vi.mock("@/lib/attendance/ip", () => ({
  isIpAllowed: () => true,
}));

import { createAttendanceDeviceId } from "@/lib/attendance/device-identity";
import { recordAttendanceScan } from "@/lib/attendance/scan-service";

const attendanceSession = {
  id: "session-1",
  courseId: "course-1",
  status: "ACTIVE",
  allowedIpRanges: [],
  schoolLat: 41.0082,
  schoolLng: 28.9784,
  allowedRadiusMeters: 100,
  course: { id: "course-1", name: "Test Dersi", code: "TST101" },
};

const tokenRecord = {
  id: "token-1",
  sessionId: attendanceSession.id,
  nonceHash: "nonce-hash",
  signature: "valid-token-with-more-than-twenty-characters",
  issuedAt: new Date(Date.now() - 1_000),
  expiresAt: new Date(Date.now() + 60_000),
  createdAt: new Date(),
  session: attendanceSession,
};

const input = {
  token: tokenRecord.signature,
  latitude: 41.0082,
  longitude: 28.9784,
  accuracyMeters: 8,
  scanSource: "Test Kamerası",
};

describe("recordAttendanceScan device reuse protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyQrToken.mockResolvedValue({ sessionId: attendanceSession.id });
    mocks.qrTokenFindUnique.mockResolvedValue(tokenRecord);
    mocks.userFindUnique
      .mockResolvedValueOnce({
        id: "student-a",
        name: "Öğrenci A",
        email: "a@example.test",
        schoolNumber: "1001",
        image: "/a.jpg",
      })
      .mockResolvedValueOnce({
        id: "student-b",
        name: "Öğrenci B",
        email: "b@example.test",
        schoolNumber: "1002",
        image: "/b.jpg",
      });
    mocks.enrollmentFindFirst
      .mockResolvedValueOnce({ id: "enrollment-a" })
      .mockResolvedValueOnce({ id: "enrollment-b" });
    mocks.attendanceRecordFindUnique.mockResolvedValue(null);
    mocks.attendanceRecordFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "record-a" });
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        attendanceRecord: { create: mocks.transactionRecordCreate },
        attendanceAttempt: { create: mocks.transactionAttemptCreate },
      }),
    );
    mocks.createQrScanLog.mockResolvedValue({ id: "log-1" });
    mocks.attendanceAttemptCreate.mockResolvedValue({ id: "attempt-b" });
  });

  it("accepts the first account and rejects a second account from the same browser", async () => {
    const deviceId = createAttendanceDeviceId();
    const context = { ipAddress: "10.0.0.12", userAgent: "Test Browser" };

    await expect(
      recordAttendanceScan("student-a", input, context, deviceId),
    ).resolves.toMatchObject({ sessionId: attendanceSession.id });

    const acceptedRecord = mocks.transactionRecordCreate.mock.calls[0][0].data;
    expect(acceptedRecord.deviceFingerprintHash).toMatch(/^[a-f0-9]{64}$/);
    expect(acceptedRecord.deviceFingerprintHash).not.toContain(deviceId);
    expect(mocks.transactionAttemptCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId: "student-a",
        status: "ACCEPTED",
        deviceFingerprintHash: acceptedRecord.deviceFingerprintHash,
      }),
    });

    await expect(
      recordAttendanceScan("student-b", input, context, deviceId),
    ).rejects.toMatchObject({ status: 409, code: "DEVICE_ALREADY_USED" });

    expect(mocks.attendanceRecordFindFirst).toHaveBeenLastCalledWith({
      where: {
        sessionId: attendanceSession.id,
        deviceFingerprintHash: acceptedRecord.deviceFingerprintHash,
        enrollmentId: { not: "enrollment-b" },
      },
      select: { id: true },
    });
    expect(mocks.attendanceAttemptCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId: "student-b",
        enrollmentId: "enrollment-b",
        status: "REJECTED",
        reasonCode: "DEVICE_ALREADY_USED",
        deviceFingerprintHash: acceptedRecord.deviceFingerprintHash,
      }),
    });
    expect(mocks.createQrScanLog).toHaveBeenLastCalledWith(
      expect.objectContaining({
        userId: "student-b",
        result: "DEVICE_ALREADY_USED",
        metadata: { reasonCode: "DEVICE_ALREADY_USED" },
      }),
    );
  });
});
