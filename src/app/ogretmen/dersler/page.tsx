import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { TeacherLayout } from "@/components/layout/teacher-layout";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MaterialIcon } from "@/components/ui/icons";
import { CourseCreateModal } from "@/components/teacher/course-create-modal";
import { CourseListItem } from "@/components/teacher/course-list-item";
import { listTeacherCourses } from "@/lib/courses/service";
import { prisma } from "@/lib/db";

type PageProps = {
  searchParams?: Promise<{ search?: string }>;
};

export default async function TeacherCoursesPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");
  if (session.user.role !== "TEACHER") redirect("/ogrenci");

  const [teacher, params] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, role: true, image: true },
    }),
    searchParams,
  ]);

  if (!teacher || teacher.role !== "TEACHER") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="font-h2 text-h2 text-on-surface">Öğretmen hesabı bulunamadı</h1>
          <p className="mt-3 font-body-md text-body-md leading-6 text-on-surface-variant">
            Giriş yaptığınız hesap henüz öğretmen rolüyle yetkilendirilmemiş. Sistem yöneticinizle iletişime geçin.
          </p>
          <Link href="/" className="mt-6 inline-block font-label-sm text-label-sm text-secondary">
            Ana sayfaya dön
          </Link>
        </div>
      </main>
    );
  }

  const allCourses = await listTeacherCourses(teacher.id);
  const search = params?.search?.trim().toLocaleLowerCase("tr-TR");
  const courses = search
    ? allCourses.filter(
        (course) =>
          course &&
          (course.name.toLocaleLowerCase("tr-TR").includes(search) ||
            course.code.toLocaleLowerCase("tr-TR").includes(search)),
      )
    : allCourses;
  const activeCourseCount = courses.filter((course) => course?.hasActiveSession).length;

  return (
    <TeacherLayout
      userName={teacher.name ?? teacher.email}
      userImage={teacher.image}
      pageTitle="Derslerim"
      showSearch={true}
      searchPlaceholder="Ders kodu veya adı ara…"
    >
      <div className="animate-fade-in-up mx-auto max-w-container-max-width px-6 py-stack-lg sm:px-margin-page">
        <div className="mb-4">
          <Link
            href="/ogretmen"
            className="inline-flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-primary"
          >
            <MaterialIcon name="arrow_back" className="text-sm" /> Dashboard&apos;a dön
          </Link>
        </div>

        <div className="mb-stack-lg flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-h1 text-h1 text-on-surface">Derslerim</h1>
              {activeCourseCount > 0 ? (
                <span className="rounded-md border border-neutral-200 bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-800">
                  {activeCourseCount} canlı oturum
                </span>
              ) : (
                <span className="rounded-full bg-surface-container px-3 py-1 font-label-sm text-label-sm text-on-surface-variant">
                  {courses.length} kayıtlı ders
                </span>
              )}
            </div>
            <p className="mt-2 max-w-2xl font-body-md text-body-md leading-6 text-on-surface-variant sm:text-body-lg">
              Yoklama oturumu başlatmak, öğrenci listesini güncellemek veya raporları incelemek için ilgili dersi seçin.
            </p>
          </div>
          <CourseCreateModal />
        </div>

        {courses.length === 0 ? (
          <Card className="p-4">
            <EmptyState
              title="Henüz ders eklenmedi"
              description="Yeni ders ekle düğmesini kullanarak dersinizi oluşturun; ardından Excel öğrenci listesini yükleyip yoklamaya başlayabilirsiniz."
            />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="border-b border-outline-variant/60 bg-surface-container-low/50 px-6 py-3 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
              Tüm Dersler ({courses.length})
            </div>
            <div className="stagger-children divide-y divide-outline-variant/60">
              {courses.map((course) => course && <CourseListItem key={course.id} course={course} />)}
            </div>
          </Card>
        )}
      </div>
    </TeacherLayout>
  );
}
