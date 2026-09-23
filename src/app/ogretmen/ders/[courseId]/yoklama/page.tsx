import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { QrDisplay } from "@/components/teacher/qr-display";
import { getTeacherCourse } from "@/lib/courses/service";

type PageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function AttendanceQrPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");
  if (session.user.role !== "TEACHER") redirect("/ogrenci");

  const { courseId } = await params;
  const course = await getTeacherCourse(session.user.id, courseId);

  if (!course) redirect("/ogretmen");

  return (
    <main className="flex min-h-dvh flex-col bg-surface-container-lowest">
      <QrDisplay courseId={courseId} />
    </main>
  );
}
