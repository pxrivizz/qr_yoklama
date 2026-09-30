ALTER TABLE "Course"
DROP CONSTRAINT IF EXISTS "Course_preparatory_daily_hours_check";

ALTER TABLE "Course"
DROP COLUMN "dailyLessonHourCount";

-- The unique (courseId, weekday) index already supports lookups by courseId.
DROP INDEX "CoursePreparatoryDayPlan_courseId_idx";
