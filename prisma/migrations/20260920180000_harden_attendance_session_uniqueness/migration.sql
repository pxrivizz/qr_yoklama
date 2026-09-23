-- Prevent concurrent requests from creating duplicate weekly slots.
CREATE UNIQUE INDEX "AttendanceSession_courseId_weekNumber_sessionIndexInWeek_key"
ON "AttendanceSession"("courseId", "weekNumber", "sessionIndexInWeek");

-- Prisma cannot express a partial unique index. PostgreSQL enforces at most
-- one ACTIVE session per course even when two start requests race.
CREATE UNIQUE INDEX "AttendanceSession_one_active_per_course_key"
ON "AttendanceSession"("courseId")
WHERE "status" = 'ACTIVE';
