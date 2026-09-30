CREATE TYPE "BugReportStatus_new" AS ENUM ('PENDING', 'IN_PROGRESS', 'FIXED');

ALTER TABLE "BugReport" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "BugReport"
  ALTER COLUMN "status" TYPE "BugReportStatus_new"
  USING (
    CASE
      WHEN "status"::text = 'DEPLOYED' THEN 'FIXED'
      WHEN "status"::text IN ('ANALYZING', 'PATCH_READY', 'DEPLOYING') THEN 'IN_PROGRESS'
      ELSE 'PENDING'
    END
  )::"BugReportStatus_new";

DROP TYPE "BugReportStatus";
ALTER TYPE "BugReportStatus_new" RENAME TO "BugReportStatus";
ALTER TABLE "BugReport" ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "BugReport"
  ADD COLUMN "handledById" TEXT,
  ADD COLUMN "resolvedAt" TIMESTAMP(3),
  DROP COLUMN "aiSummary",
  DROP COLUMN "aiAnalysis",
  DROP COLUMN "aiError",
  DROP COLUMN "patchDiff",
  DROP COLUMN "agentLog",
  DROP COLUMN "analyzedAt",
  DROP COLUMN "approvedAt",
  DROP COLUMN "deployedAt";

UPDATE "BugReport" SET "resolvedAt" = "updatedAt" WHERE "status" = 'FIXED';

CREATE TABLE "BugReportResponse" (
  "id" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BugReportResponse_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BugReport_handledById_idx" ON "BugReport"("handledById");
CREATE INDEX "BugReportResponse_reportId_createdAt_idx" ON "BugReportResponse"("reportId", "createdAt");
CREATE INDEX "BugReportResponse_authorId_idx" ON "BugReportResponse"("authorId");

ALTER TABLE "BugReport"
  ADD CONSTRAINT "BugReport_handledById_fkey"
  FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BugReportResponse"
  ADD CONSTRAINT "BugReportResponse_reportId_fkey"
  FOREIGN KEY ("reportId") REFERENCES "BugReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BugReportResponse"
  ADD CONSTRAINT "BugReportResponse_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
