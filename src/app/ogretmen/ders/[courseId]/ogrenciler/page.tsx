import { redirect } from "next/navigation";

import { TeacherLayout } from "@/components/layout/teacher-layout";
import { CourseStudentsView } from "@/components/teacher/course-students-view";
import { getCourseStudents } from "@/lib/enrollments/service";
import { requireTeacher } from "@/lib/auth/authorization";

type PageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function CourseStudentsPage({ params }: PageProps) {
  const teacher = await requireTeacher();

  const { courseId } = await params;

  let data;
  try {
    data = await getCourseStudents(teacher.id, courseId);
  } catch {
    redirect("/ogretmen");
  }

  return (
    <TeacherLayout
      userName={teacher.name ?? teacher.email}
      userImage={teacher.image}
      pageTitle={`${data.course.code} · Öğrenci Listesi`}
    >
      <CourseStudentsView initialData={data} />
    </TeacherLayout>
  );
}
