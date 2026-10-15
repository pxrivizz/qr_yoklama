ALTER TABLE "Course"
ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "Enrollment"
ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "AttendanceSession"
ADD COLUMN "policySnapshot" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "voidedAt" TIMESTAMP(3),
ADD COLUMN "voidedByUserId" TEXT,
ADD COLUMN "voidReason" TEXT;

UPDATE "AttendanceRecord"
SET "status" = 'EXCUSED'
WHERE "isExcused" = TRUE;

ALTER TABLE "AttendanceRecord"
DROP COLUMN "isExcused";

CREATE TABLE "CourseMember" (
  "courseId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "CourseMemberRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseMember_pkey" PRIMARY KEY ("courseId", "userId")
);

INSERT INTO "CourseMember" ("courseId", "userId", "role", "updatedAt")
SELECT "id", "teacherId", 'OWNER', CURRENT_TIMESTAMP
FROM "Course"
ON CONFLICT ("courseId", "userId") DO NOTHING;

CREATE TABLE "CourseAttendancePolicy" (
  "courseId" TEXT NOT NULL,
  "photoMode" "VerificationMode" NOT NULL DEFAULT 'REQUIRED',
  "networkMode" "VerificationMode" NOT NULL DEFAULT 'REQUIRED',
  "locationMode" "VerificationMode" NOT NULL DEFAULT 'REQUIRED',
  "deviceMode" "VerificationMode" NOT NULL DEFAULT 'REQUIRED',
  "maxLocationAccuracyMeters" INTEGER,
  "lateAfterMinutes" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseAttendancePolicy_pkey" PRIMARY KEY ("courseId")
);

INSERT INTO "CourseAttendancePolicy" (
  "courseId",
  "networkMode",
  "updatedAt"
)
SELECT
  "id",
  CASE
    WHEN cardinality("allowedIpRanges") = 0 THEN 'DISABLED'::"VerificationMode"
    ELSE 'REQUIRED'::"VerificationMode"
  END,
  CURRENT_TIMESTAMP
FROM "Course"
ON CONFLICT ("courseId") DO NOTHING;

UPDATE "AttendanceSession" AS session
SET "policySnapshot" = jsonb_build_object(
  'photoMode', policy."photoMode",
  'networkMode', policy."networkMode",
  'locationMode', policy."locationMode",
  'deviceMode', policy."deviceMode",
  'maxLocationAccuracyMeters', policy."maxLocationAccuracyMeters",
  'lateAfterMinutes', policy."lateAfterMinutes"
)
FROM "CourseAttendancePolicy" AS policy
WHERE policy."courseId" = session."courseId";

CREATE TABLE "AttendanceRevision" (
  "id" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "editedByUserId" TEXT NOT NULL,
  "beforeStatus" "AttendanceStatus" NOT NULL,
  "afterStatus" "AttendanceStatus" NOT NULL,
  "beforeNote" TEXT,
  "afterNote" TEXT,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AttendanceRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AttendanceDeviceClaim" (
  "sessionId" TEXT NOT NULL,
  "deviceFingerprintHash" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AttendanceDeviceClaim_pkey" PRIMARY KEY ("sessionId", "deviceFingerprintHash")
);

INSERT INTO "AttendanceDeviceClaim" (
  "sessionId", "deviceFingerprintHash", "enrollmentId"
)
SELECT "sessionId", "deviceFingerprintHash", "enrollmentId"
FROM "AttendanceRecord"
WHERE "deviceFingerprintHash" IS NOT NULL
ON CONFLICT DO NOTHING;

DROP INDEX IF EXISTS "AttendanceSession_courseId_weekNumber_sessionIndexInWeek_key";
DROP INDEX IF EXISTS "AttendanceSession_courseId_sessionDate_lessonPeriod_key";
DROP INDEX IF EXISTS "AttendanceRecord_sessionId_deviceFingerprintHash_key";

CREATE UNIQUE INDEX "AttendanceSession_active_weekly_slot_key"
ON "AttendanceSession"("courseId", "weekNumber", "sessionIndexInWeek")
WHERE "status" <> 'VOIDED' AND "slotType" = 'WEEKLY';

CREATE UNIQUE INDEX "AttendanceSession_active_calendar_slot_key"
ON "AttendanceSession"("courseId", "sessionDate", "lessonPeriod")
WHERE "status" <> 'VOIDED' AND "slotType" = 'CALENDAR_PERIOD';

CREATE INDEX "Course_archivedAt_idx" ON "Course"("archivedAt");
CREATE INDEX "Enrollment_courseId_archivedAt_idx" ON "Enrollment"("courseId", "archivedAt");
CREATE INDEX "CourseMember_userId_role_idx" ON "CourseMember"("userId", "role");
CREATE INDEX "AttendanceRecord_sessionId_deviceFingerprintHash_idx"
ON "AttendanceRecord"("sessionId", "deviceFingerprintHash");
CREATE INDEX "AttendanceRevision_recordId_createdAt_idx"
ON "AttendanceRevision"("recordId", "createdAt");
CREATE INDEX "AttendanceRevision_editedByUserId_createdAt_idx"
ON "AttendanceRevision"("editedByUserId", "createdAt");
CREATE INDEX "AttendanceDeviceClaim_enrollmentId_idx"
ON "AttendanceDeviceClaim"("enrollmentId");

ALTER TABLE "CourseMember"
ADD CONSTRAINT "CourseMember_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CourseMember"
ADD CONSTRAINT "CourseMember_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CourseAttendancePolicy"
ADD CONSTRAINT "CourseAttendancePolicy_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AttendanceSession"
ADD CONSTRAINT "AttendanceSession_voidedByUserId_fkey"
FOREIGN KEY ("voidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AttendanceRevision"
ADD CONSTRAINT "AttendanceRevision_recordId_fkey"
FOREIGN KEY ("recordId") REFERENCES "AttendanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AttendanceRevision"
ADD CONSTRAINT "AttendanceRevision_editedByUserId_fkey"
FOREIGN KEY ("editedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AttendanceDeviceClaim"
ADD CONSTRAINT "AttendanceDeviceClaim_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AttendanceDeviceClaim"
ADD CONSTRAINT "AttendanceDeviceClaim_enrollmentId_fkey"
FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
