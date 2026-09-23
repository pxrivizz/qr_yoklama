-- CreateEnum
CREATE TYPE "QrScanActionType" AS ENUM ('YOKLAMA', 'GIRIS', 'CIKIS');

-- CreateEnum
CREATE TYPE "QrScanResult" AS ENUM ('SUCCESS', 'INVALID_QR', 'EXPIRED_QR', 'DUPLICATE_SCAN', 'OUT_OF_RADIUS', 'OUT_OF_NETWORK', 'NOT_ENROLLED', 'PHOTO_REQUIRED', 'ERROR');

-- CreateTable
CREATE TABLE "QrScanLog" (
    "id" TEXT NOT NULL,
    "courseId" TEXT,
    "sessionId" TEXT,
    "enrollmentId" TEXT,
    "userId" TEXT,
    "studentName" TEXT,
    "studentNumber" TEXT,
    "className" TEXT,
    "actionType" "QrScanActionType" NOT NULL DEFAULT 'YOKLAMA',
    "scannedBy" TEXT,
    "scanSource" TEXT DEFAULT 'Kamera',
    "deviceInfo" TEXT,
    "ipAddress" TEXT,
    "location" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "accuracyMeters" DOUBLE PRECISION,
    "distanceMeters" DOUBLE PRECISION,
    "result" "QrScanResult" NOT NULL DEFAULT 'SUCCESS',
    "resultMessage" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QrScanLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QrScanLog_scannedAt_idx" ON "QrScanLog"("scannedAt");

-- CreateIndex
CREATE INDEX "QrScanLog_courseId_scannedAt_idx" ON "QrScanLog"("courseId", "scannedAt");

-- CreateIndex
CREATE INDEX "QrScanLog_userId_scannedAt_idx" ON "QrScanLog"("userId", "scannedAt");

-- CreateIndex
CREATE INDEX "QrScanLog_studentNumber_idx" ON "QrScanLog"("studentNumber");

-- CreateIndex
CREATE INDEX "QrScanLog_result_idx" ON "QrScanLog"("result");

-- AddForeignKey
ALTER TABLE "QrScanLog" ADD CONSTRAINT "QrScanLog_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrScanLog" ADD CONSTRAINT "QrScanLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrScanLog" ADD CONSTRAINT "QrScanLog_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrScanLog" ADD CONSTRAINT "QrScanLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
