DELETE FROM "CoursePreparatoryDayPlan"
WHERE "weekday" IN (6, 7);

ALTER TABLE "CoursePreparatoryDayPlan"
DROP CONSTRAINT "CoursePreparatoryDayPlan_weekday_check";

ALTER TABLE "CoursePreparatoryDayPlan"
ADD CONSTRAINT "CoursePreparatoryDayPlan_weekday_check"
CHECK ("weekday" BETWEEN 1 AND 5);
