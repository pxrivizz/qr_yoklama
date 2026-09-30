CREATE TYPE "BugReportStatus" AS ENUM (
  'SUBMITTED',
  'ANALYZING',
  'PATCH_READY',
  'DEPLOYING',
  'DEPLOYED',
  'REJECTED',
  'FAILED'
);

CREATE TABLE "BugReport" (
  "id" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "screenshotPath" TEXT NOT NULL,
  "screenshotMimeType" TEXT NOT NULL,
  "pageUrl" TEXT,
  "userAgent" TEXT,
  "status" "BugReportStatus" NOT NULL DEFAULT 'SUBMITTED',
  "aiSummary" TEXT,
  "aiAnalysis" TEXT,
  "aiError" TEXT,
  "patchDiff" TEXT,
  "agentLog" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "analyzedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "deployedAt" TIMESTAMP(3),

  CONSTRAINT "BugReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BugReport_status_createdAt_idx" ON "BugReport"("status", "createdAt");
CREATE INDEX "BugReport_reporterId_createdAt_idx" ON "BugReport"("reporterId", "createdAt");

ALTER TABLE "BugReport"
ADD CONSTRAINT "BugReport_reporterId_fkey"
FOREIGN KEY ("reporterId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
