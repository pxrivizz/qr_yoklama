CREATE TABLE "CoursePreparatoryDayPlan" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "weekday" INTEGER NOT NULL,
  "lessonCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CoursePreparatoryDayPlan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CoursePreparatoryDayPlan_weekday_check" CHECK ("weekday" BETWEEN 1 AND 7),
  CONSTRAINT "CoursePreparatoryDayPlan_lesson_count_check" CHECK ("lessonCount" BETWEEN 0 AND 16)
);

CREATE UNIQUE INDEX "CoursePreparatoryDayPlan_courseId_weekday_key"
ON "CoursePreparatoryDayPlan"("courseId", "weekday");

CREATE INDEX "CoursePreparatoryDayPlan_courseId_idx"
ON "CoursePreparatoryDayPlan"("courseId");

ALTER TABLE "CoursePreparatoryDayPlan"
ADD CONSTRAINT "CoursePreparatoryDayPlan_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "CoursePreparatoryDayPlan" (
  "id", "courseId", "weekday", "lessonCount", "createdAt", "updatedAt"
)
SELECT
  'prep-' || "id" || '-' || weekday,
  "id",
  weekday,
  COALESCE("dailyLessonHourCount", 0),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Course"
CROSS JOIN generate_series(1, 5) AS weekday
WHERE "attendanceMode" = 'PREPARATORY';

INSERT INTO "CoursePreparatoryDayPlan" (
  "id", "courseId", "weekday", "lessonCount", "createdAt", "updatedAt"
)
SELECT
  'prep-' || "id" || '-' || weekday,
  "id",
  weekday,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Course"
CROSS JOIN generate_series(6, 7) AS weekday
WHERE "attendanceMode" = 'PREPARATORY';
