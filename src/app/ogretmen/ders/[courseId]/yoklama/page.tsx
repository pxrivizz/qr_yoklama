import { redirect } from "next/navigation";

import { QrDisplay } from "@/components/teacher/qr-display";
import { getTeacherCourse } from "@/lib/courses/service";
import { requireTeacher } from "@/lib/auth/authorization";

type PageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function AttendanceQrPage({ params }: PageProps) {
  const teacher = await requireTeacher();

  const { courseId } = await params;
  const course = await getTeacherCourse(teacher.id, courseId);

  if (!course) redirect("/ogretmen");

  return (
    <main className="flex min-h-dvh flex-col bg-surface-container-lowest">
      <QrDisplay courseId={courseId} />
    </main>
  );
}
