ALTER TYPE "QrScanResult" ADD VALUE 'DEVICE_ALREADY_USED';

CREATE UNIQUE INDEX "AttendanceRecord_sessionId_deviceFingerprintHash_key"
ON "AttendanceRecord"("sessionId", "deviceFingerprintHash");
