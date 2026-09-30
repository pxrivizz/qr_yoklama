ALTER TABLE "CoursePreparatoryDayPlan"
DROP CONSTRAINT "CoursePreparatoryDayPlan_pkey";

DROP INDEX "CoursePreparatoryDayPlan_courseId_weekday_key";

ALTER TABLE "CoursePreparatoryDayPlan"
DROP COLUMN "id",
DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD CONSTRAINT "CoursePreparatoryDayPlan_pkey" PRIMARY KEY ("courseId", "weekday");
