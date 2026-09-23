import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { DeleteCourseButton } from "@/components/teacher/delete-course-button";
import { AttendanceStartModal } from "@/components/teacher/attendance-start-modal";

type CourseListItemProps = {
  course: {
    id: string;
    name: string;
    code: string;
    hasActiveSession: boolean;
    plannedSessionCount: number;
    weeklySessionCount: number;
    totalWeeks: number;
    _count: {
      enrollments: number;
      attendanceSessions: number;
    };
  };
};

export function CourseListItem({ course }: CourseListItemProps) {
  const completed = course._count.attendanceSessions;
  const planned = course.plannedSessionCount;
  const progress = planned > 0 ? Math.min(100, Math.round((completed / planned) * 100)) : 0;

  return (
    <article className="card-hover group flex flex-col gap-5 border-b border-outline-variant px-5 py-5 transition-all duration-200 last:border-b-0 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="code">{course.code}</Badge>
          {course.hasActiveSession && (
            <span className="font-mono text-xs font-medium text-neutral-600">
              Oturum Açık
            </span>
          )}
        </div>
        <h2 className="mt-2 font-h3 text-h3 text-on-surface">{course.name}</h2>
        <div className="mt-2 flex max-w-md items-center gap-3">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-outline-variant"
            role="progressbar"
            aria-label={`${course.name} ders ilerlemesi`}
            aria-valuemin={0}
            aria-valuemax={planned}
            aria-valuenow={completed}
          >
            <div className="progress-gradient h-full rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <span className="shrink-0 font-body-md text-body-md tabular-nums text-on-surface-variant">{completed}/{planned} oturum</span>
        </div>
        <p className="mt-1 font-label-sm text-label-sm text-on-surface-variant">{course._count.enrollments} öğrenci kayıtlı</p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1 sm:gap-2">
        {course.hasActiveSession ? (
          <ButtonLink href={`/ogretmen/ders/${course.id}/yoklama`} variant="primary" size="md">
            Yoklamaya dön
          </ButtonLink>
        ) : (
          <AttendanceStartModal
            courseId={course.id}
            courseName={course.name}
            totalWeeks={course.totalWeeks}
            weeklySessionCount={course.weeklySessionCount}
            completedSessionCount={completed}
          />
        )}
        <Link
          href={`/ogretmen/ders/${course.id}/manuel`}
          className="rounded-lg px-3 py-2 font-label-sm text-label-sm text-on-surface-variant transition-all duration-200 hover:bg-surface-container hover:text-on-surface hover:shadow-sm"
        >
          Manuel yoklama
        </Link>
        <Link
          href={`/ogretmen/ders/${course.id}/rapor`}
          className="rounded-lg px-3 py-2 font-label-sm text-label-sm text-on-surface-variant transition-all duration-200 hover:bg-surface-container hover:text-on-surface hover:shadow-sm"
        >
          Rapor
        </Link>
        <Link
          href={`/ogretmen/ders/${course.id}`}
          className="rounded-lg px-3 py-2 font-label-sm text-label-sm text-on-surface-variant transition-all duration-200 hover:bg-surface-container hover:text-on-surface hover:shadow-sm"
        >
          Ayarlar
        </Link>
        <DeleteCourseButton courseId={course.id} />
      </div>
    </article>
  );
}
