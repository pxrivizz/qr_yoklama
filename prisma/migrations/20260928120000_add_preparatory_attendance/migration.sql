CREATE TYPE "CourseAttendanceMode" AS ENUM ('STANDARD', 'PREPARATORY');
CREATE TYPE "AttendanceSlotType" AS ENUM ('WEEKLY', 'CALENDAR_PERIOD');

ALTER TABLE "Course"
ADD COLUMN "attendanceMode" "CourseAttendanceMode" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN "dailyLessonHourCount" INTEGER;

ALTER TABLE "AttendanceSession"
ALTER COLUMN "weekNumber" DROP NOT NULL,
ALTER COLUMN "sessionIndexInWeek" DROP NOT NULL,
ADD COLUMN "slotType" "AttendanceSlotType" NOT NULL DEFAULT 'WEEKLY',
ADD COLUMN "sessionDate" DATE,
ADD COLUMN "lessonPeriod" INTEGER;

CREATE INDEX "AttendanceSession_courseId_sessionDate_idx"
ON "AttendanceSession"("courseId", "sessionDate");

CREATE UNIQUE INDEX "AttendanceSession_courseId_sessionDate_lessonPeriod_key"
ON "AttendanceSession"("courseId", "sessionDate", "lessonPeriod");

ALTER TABLE "Course"
ADD CONSTRAINT "Course_preparatory_daily_hours_check"
CHECK (
  ("attendanceMode" = 'STANDARD' AND "dailyLessonHourCount" IS NULL)
  OR
  ("attendanceMode" = 'PREPARATORY' AND "dailyLessonHourCount" BETWEEN 1 AND 16)
);

ALTER TABLE "AttendanceSession"
ADD CONSTRAINT "AttendanceSession_slot_shape_check"
CHECK (
  (
    "slotType" = 'WEEKLY'
    AND "weekNumber" IS NOT NULL
    AND "sessionIndexInWeek" IS NOT NULL
    AND "sessionDate" IS NULL
    AND "lessonPeriod" IS NULL
  )
  OR
  (
    "slotType" = 'CALENDAR_PERIOD'
    AND "weekNumber" IS NULL
    AND "sessionIndexInWeek" IS NULL
    AND "sessionDate" IS NOT NULL
    AND "lessonPeriod" BETWEEN 1 AND 16
  )
);
