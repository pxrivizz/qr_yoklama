import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { MaterialIcon } from "@/components/ui/icons";
import { StudentNotifications } from "@/components/student/student-notifications";
import { CourseDetailView } from "@/components/student/course-detail-view";
import { getStudentCourseAttendanceDetail } from "@/lib/students/attendance-service";
import { prisma } from "@/lib/db";

type PageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function StudentCourseDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");
  if (session.user.role !== "STUDENT") redirect("/ogretmen");

  const { courseId } = await params;

  const student = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, schoolNumber: true },
  });

  if (!student) redirect("/giris");

  let detail;
  try {
    detail = await getStudentCourseAttendanceDetail(session.user.id, courseId);
  } catch {
    redirect("/ogrenci");
  }

  return (
    <main className="min-h-dvh bg-background">
      {/* Header */}
      <header className="border-b border-outline-variant bg-surface-container-lowest/80 backdrop-blur-lg sticky top-0 z-20">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/ogrenci" className="flex min-w-0 shrink items-center gap-2 font-h3 text-h3 text-primary">
            <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-white">
              <MaterialIcon name="school" className="text-xl" />
            </div>
            <span className="truncate text-sm font-bold sm:text-base">MSKÜ Yoklama</span>
          </Link>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <StudentNotifications />

            <div className="flex items-center gap-1.5">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-outline-variant bg-surface-container">
                {student.image ? (
                  <Image
                    src={student.image}
                    alt={student.name ?? "Öğrenci"}
                    width={32}
                    height={32}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <MaterialIcon name="person" className="text-lg text-on-surface-variant" />
                )}
              </div>
              <span className="hidden font-label-sm text-label-sm text-on-surface sm:inline">
                {student.name ?? student.email}
              </span>
            </div>

            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/giris" });
              }}
            >
              <button
                type="submit"
                className="flex h-9 items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 text-xs font-medium text-on-surface-variant transition-colors hover:border-error/40 hover:bg-error-container/20 hover:text-error"
                title="Çıkış yap"
              >
                <MaterialIcon name="logout" className="text-base" />
                <span className="hidden sm:inline">Çıkış yap</span>
              </button>
            </form>
          </div>
        </div>
      </header>


      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <CourseDetailView initialData={detail} />
      </div>
    </main>
  );
}
