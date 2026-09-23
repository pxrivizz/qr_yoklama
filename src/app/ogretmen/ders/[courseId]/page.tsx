import { redirect } from "next/navigation";
import Link from "next/link";

import { auth } from "@/auth";
import { TeacherLayout } from "@/components/layout/teacher-layout";
import { Card } from "@/components/ui/card";
import { EnrollmentImport } from "@/components/teacher/enrollment-import";
import { AttendanceStartModal } from "@/components/teacher/attendance-start-modal";
import { CourseForm } from "@/components/teacher/course-form";
import { ButtonLink } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/icons";
import { getTeacherCourse } from "@/lib/courses/service";

type PageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function CourseSettingsPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");
  if (session.user.role !== "TEACHER") redirect("/ogrenci");

  const { courseId } = await params;
  const course = await getTeacherCourse(session.user.id, courseId);

  if (!course) redirect("/ogretmen");

  return (
    <TeacherLayout
      userName={session.user.name ?? session.user.email ?? "Öğretmen"}
      pageTitle={course.name}
    >
      <div className="animate-fade-in-up mx-auto max-w-5xl px-6 py-stack-lg sm:px-margin-page">
        <Link href="/ogretmen/dersler" className="inline-flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant transition-colors duration-200 hover:text-on-surface">
          <MaterialIcon name="arrow_back" /> Derslerim
        </Link>
        <div className="mt-5 flex flex-col gap-5 border-b border-outline-variant/60 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">{course.code}</p>
            <h1 className="mt-1 font-h1 text-h1 text-on-surface">{course.name}</h1>
            <p className="mt-2 font-body-md text-body-md text-on-surface-variant">Ders ayarları ve öğrenci listesi</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/ogretmen/ders/${course.id}/rapor`} variant="secondary">
              Yoklama raporu
            </ButtonLink>
            <ButtonLink href={`/ogretmen/ders/${course.id}/ogrenciler`} variant="secondary">
              Öğrenci listesi
            </ButtonLink>
            {course.hasActiveSession ? (
              <ButtonLink href={`/ogretmen/ders/${course.id}/yoklama`}>
                Yoklamaya dön
              </ButtonLink>
            ) : (
              <AttendanceStartModal
                courseId={course.id}
                courseName={course.name}
                totalWeeks={course.totalWeeks}
                weeklySessionCount={course.weeklySessionCount}
                completedSessionCount={course._count.attendanceSessions}
              />
            )}
            <ButtonLink href={`/ogretmen/ders/${course.id}/manuel`} variant="secondary">
              Manuel yoklama
            </ButtonLink>
          </div>
        </div>

        <div className="mt-7 grid gap-6">
          <Card className="p-5 sm:p-6">
            <h2 className="font-h3 text-h3 text-on-surface">Ders ayarları</h2>
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant">Konum, ağ kuralları ve oturum planlaması.</p>
            <div className="mt-6">
              <CourseForm course={course} />
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="font-h3 text-h3 text-on-surface">Öğrenci listesi</h2>
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
              Excel dosyasından öğrenci kayıtlarını içe aktarın. Mevcut kayıtlar güncellenir.
            </p>
            <div className="mt-6">
              <EnrollmentImport courseId={course.id} />
            </div>
          </Card>
        </div>
      </div>
    </TeacherLayout>
  );
}
