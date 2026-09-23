import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { TeacherLayout } from "@/components/layout/teacher-layout";
import { CourseStudentsView } from "@/components/teacher/course-students-view";
import { getCourseStudents } from "@/lib/enrollments/service";

type PageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function CourseStudentsPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");
  if (session.user.role !== "TEACHER") redirect("/ogrenci");

  const { courseId } = await params;

  let data;
  try {
    data = await getCourseStudents(session.user.id, courseId);
  } catch {
    redirect("/ogretmen");
  }

  return (
    <TeacherLayout
      userName={session.user.name ?? session.user.email ?? "Öğretmen"}
      userImage={session.user.image}
      pageTitle={`${data.course.code} · Öğrenci Listesi`}
    >
      <CourseStudentsView initialData={data} />
    </TeacherLayout>
  );
}
