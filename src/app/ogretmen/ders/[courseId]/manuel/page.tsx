import Link from "next/link";

import { TeacherLayout } from "@/components/layout/teacher-layout";
import { Card } from "@/components/ui/card";
import { MaterialIcon } from "@/components/ui/icons";
import { ManualAttendanceForm } from "@/components/teacher/manual-attendance-form";
import { getManualAttendanceRoster } from "@/lib/attendance/session-service";
import { requireTeacher } from "@/lib/auth/authorization";
import { todayInIstanbul } from "@/lib/attendance/slot";

export default async function ManualAttendancePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const teacher = await requireTeacher();

  const { courseId } = await params;
  const { course, slot, enrollments, initialRecords, initialSession } =
    await getManualAttendanceRoster(teacher.id, courseId);

  return (
    <TeacherLayout
      userName={teacher.name ?? teacher.email}
      pageTitle="Manuel yoklama"
    >
      <div className="animate-fade-in-up mx-auto max-w-5xl px-6 py-stack-lg sm:px-margin-page">
        <Link href="/ogretmen/dersler" className="inline-flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant transition-colors duration-200 hover:text-on-surface">
          <MaterialIcon name="arrow_back" /> Derslerim
        </Link>
        <div className="mb-7 mt-5 sm:flex sm:items-end sm:justify-between">
          <div>
            <p className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">{course.code}</p>
            <h1 className="mt-1 font-h1 text-h1 text-on-surface">Manuel yoklama</h1>
            <p className="mt-2 font-body-md text-body-md text-on-surface-variant">{course.name}</p>
          </div>
          <p className="mt-3 rounded-full bg-primary-fixed px-3 py-1.5 font-label-sm text-label-sm text-on-primary-fixed-variant sm:mt-0">
            {course.attendanceMode === "PREPARATORY" ? "Tarih ve ders sırasını aşağıdan seçin" : "Hafta ve oturumu aşağıdan seçin"}
          </p>
        </div>
        <Card className="overflow-hidden">
          <ManualAttendanceForm
            courseId={courseId}
            enrollments={enrollments}
            totalWeeks={course.totalWeeks}
            weeklySessionCount={course.weeklySessionCount}
            attendanceMode={course.attendanceMode}
            preparatoryDayPlans={course.preparatoryDayPlans}
            initialWeekNumber={"weekNumber" in slot ? Math.min(slot.weekNumber ?? 1, course.totalWeeks) : 1}
            initialSessionIndex={"sessionIndexInWeek" in slot ? slot.sessionIndexInWeek ?? 1 : 1}
            initialSessionDate={"sessionDate" in slot ? slot.sessionDate ?? todayInIstanbul() : todayInIstanbul()}
            initialLessonPeriod={"lessonPeriod" in slot ? slot.lessonPeriod ?? 1 : 1}
            initialRecords={initialRecords}
            initialSession={initialSession}
          />
        </Card>
      </div>
    </TeacherLayout>
  );
}
