import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { TeacherLayout } from "@/components/layout/teacher-layout";
import { ButtonLink } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/icons";
import { prisma } from "@/lib/db";
import { getQrScanLogs } from "@/lib/attendance/qr-log-service";
import { QrLogsView } from "@/components/teacher/qr-logs-view";

export default async function TeacherLogsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");
  if (session.user.role !== "TEACHER") redirect("/ogrenci");

  const teacher = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, image: true },
  });

  if (!teacher || teacher.role !== "TEACHER") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-neutral-900">Öğretmen hesabı bulunamadı</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Bu sayfayı görüntülemek için öğretmen yetkisine sahip bir hesapla giriş yapmalısınız.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm font-medium text-neutral-900 underline">
            Ana sayfaya dön
          </Link>
        </div>
      </main>
    );
  }

  const [courses, initialData] = await Promise.all([
    prisma.course.findMany({
      where: { teacherId: teacher.id },
      select: { id: true, name: true, code: true },
      orderBy: { code: "asc" },
    }),
    getQrScanLogs({
      teacherId: teacher.id,
      page: 1,
      pageSize: 20,
    }),
  ]);

  return (
    <TeacherLayout
      userName={teacher.name ?? teacher.email}
      userImage={teacher.image}
      pageTitle="QR Okutma Logları"
    >
      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8 space-y-8">
        {/* Üst Başlık & Eylemler */}
        <div className="flex flex-col gap-4 border-b border-neutral-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">
                <MaterialIcon name="security" className="text-sm text-neutral-500" />
                Güvenlik & Denetim Portalı
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl flex items-center gap-2.5">
              <MaterialIcon name="receipt_long" className="text-neutral-700" />
              QR Okutma Logları
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              Öğrencilerin QR kodlarını ne zaman, nereden, hangi kaynaktan ve cihazdan okuttuğunu anlık olarak inceleyin.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <ButtonLink
              href="/ogretmen"
              variant="secondary"
              className="border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50 shadow-none text-xs"
            >
              <MaterialIcon name="arrow_back" className="mr-1.5 text-base" />
              Genel Bakış
            </ButtonLink>
            <ButtonLink
              href="/ogretmen/dersler"
              variant="secondary"
              className="border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50 shadow-none text-xs"
            >
              <MaterialIcon name="school" className="mr-1.5 text-base" />
              Derslerim
            </ButtonLink>
          </div>
        </div>

        {/* Ana Log Listesi ve Filtreleme Bileşeni */}
        <QrLogsView
          initialLogs={initialData.logs}
          initialTotal={initialData.pagination.total}
          initialStats={initialData.stats}
          courses={courses}
        />
      </div>
    </TeacherLayout>
  );
}
