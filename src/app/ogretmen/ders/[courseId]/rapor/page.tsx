import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { TeacherLayout } from "@/components/layout/teacher-layout";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MaterialIcon } from "@/components/ui/icons";
import { Table, TableBody, TableHead, TableRow, Td, Th } from "@/components/ui/table";
import type { AttendanceStatus } from "@/generated/prisma/enums";
import { getCourseAttendanceReport } from "@/lib/attendance/report-service";
import { cn } from "@/lib/cn";

const statusLabels: Record<AttendanceStatus, string> = {
  PRESENT: "Var",
  ABSENT: "Yok",
  LATE: "Geç",
  EXCUSED: "Mazeretli",
  FLAGGED: "İncelemede",
};

const statusClasses: Record<AttendanceStatus, string> = {
  PRESENT: "bg-secondary/10 text-secondary",
  ABSENT: "bg-error-container text-on-error-container",
  LATE: "bg-amber-100 text-amber-800",
  EXCUSED: "bg-blue-100 text-blue-800",
  FLAGGED: "bg-violet-100 text-violet-800",
};



function sessionDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(date);
}

export default async function AttendanceReportPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");
  if (session.user.role !== "TEACHER") redirect("/ogrenci");

  const { courseId } = await params;
  const report = await getCourseAttendanceReport(session.user.id, courseId);

  return (
    <TeacherLayout
      userName={session.user.name ?? session.user.email ?? "Öğretmen"}
      pageTitle="Yoklama raporu"
    >
      <div className="animate-fade-in-up mx-auto max-w-container-max-width px-6 py-stack-lg sm:px-margin-page">
        <Link
          href={`/ogretmen/ders/${courseId}`}
          className="inline-flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant transition-colors duration-200 hover:text-on-surface"
        >
          <MaterialIcon name="arrow_back" /> Ders ayarları
        </Link>

        <div className="mt-5 flex flex-col gap-5 border-b border-outline-variant/60 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">{report.course.code}</p>
            <h1 className="mt-1 font-h1 text-h1 text-on-surface">Yoklama raporu</h1>
            <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
              {report.course.name} · öğrenci ve oturum bazlı katılım görünümü
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink
              href={`/api/courses/${courseId}/attendance/export`}
              variant="primary"
              className="btn-lift gap-2"
              download
            >
              <MaterialIcon name="download" /> Excel ile dışa aktar
            </ButtonLink>
            <ButtonLink href={`/ogretmen/ders/${courseId}/manuel`} variant="secondary">
              Manuel yoklama al
            </ButtonLink>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-y border-outline-variant/60 py-4 font-body-md text-body-md text-on-surface-variant">
          <span><strong className="text-on-surface">{report.summary.sessionCount}</strong> tamamlanan oturum</span>
          <span><strong className="text-on-surface">{report.summary.studentCount}</strong> öğrenci</span>
          <span><strong className="text-secondary">%{report.summary.averageAttendanceRate}</strong> ortalama katılım</span>
          <span className={report.summary.alertCount > 0 ? "text-error" : undefined}>
            <strong>{report.summary.alertCount}</strong> eşik uyarısı
          </span>
        </div>

        {report.sessions.length === 0 ? (
          <Card className="mt-6">
            <EmptyState
              title="Henüz tamamlanmış yoklama yok"
              description="İlk QR veya manuel yoklamayı tamamladığınızda öğrenci katılımları burada karşılaştırmalı olarak görünür."
              action={{ label: "Derslerime dön", href: "/ogretmen" }}
            />
          </Card>
        ) : report.rows.length === 0 ? (
          <Card className="mt-6">
            <EmptyState
              title="Dersin öğrenci listesi boş"
              description="Rapor oluşturabilmek için ders ayarlarından Excel öğrenci listesini yükleyin."
              action={{ label: "Öğrenci listesine git", href: `/ogretmen/ders/${courseId}` }}
            />
          </Card>
        ) : (
          <Card className="mt-6 overflow-hidden">
            <div className="border-b border-outline-variant px-5 py-4 sm:flex sm:items-center sm:justify-between sm:px-6">
              <div>
                <h2 className="font-h3 text-h3 text-on-surface">Öğrenci katılımları</h2>
                <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                  Kapalı QR oturumunda kaydı olmayan öğrenci “Yok” kabul edilir.
                </p>
              </div>
              {report.course.mandatoryAlertLimit !== null && (
                <Badge variant="warning" className="mt-3 sm:mt-0">
                  Uyarı eşiği: {report.course.mandatoryAlertLimit} yoklama
                </Badge>
              )}
            </div>
            <Table>
              <TableHead>
                <Th className="sticky left-0 z-10 min-w-56 bg-surface-container-low">Öğrenci</Th>
                {report.sessions.map((attendanceSession) => (
                  <Th key={attendanceSession.id} className="min-w-24 text-center normal-case tracking-normal">
                    <span className="block text-on-surface">H{attendanceSession.weekNumber} · O{attendanceSession.sessionIndexInWeek}</span>
                    <span className="mt-0.5 block font-normal">{sessionDate(attendanceSession.startedAt)}</span>
                  </Th>
                ))}
                <Th className="text-center">Var</Th>
                <Th className="text-center">Yok</Th>
                <Th className="text-center">Katılım</Th>
              </TableHead>
              <TableBody>
                {report.rows.map((row) => (
                  <TableRow key={row.id} className={row.alert ? "bg-error-container/25" : undefined}>
                    <Td className="sticky left-0 z-[1] min-w-56 bg-surface-container-lowest group-hover:bg-surface-container-low">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-outline-variant bg-surface-container flex items-center justify-center">
                          {row.matchedUser?.image ? (
                            <Image
                              src={row.matchedUser.image}
                              alt={row.fullNameOnList}
                              width={40}
                              height={40}
                              unoptimized
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <MaterialIcon name="person" className="text-xl text-on-surface-variant" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-on-surface">{row.fullNameOnList}</p>
                          <p className="mt-0.5 font-label-sm text-label-sm text-on-surface-variant">{row.schoolNumberOnList}</p>
                        </div>
                        {row.alert && <Badge variant="warning" className="flex-shrink-0">Sınırda</Badge>}
                      </div>
                    </Td>
                    {row.statuses.map((status, index) => (
                      <Td key={`${row.id}-${report.sessions[index]?.id}`} className="text-center">
                        <span className={cn("inline-flex min-w-14 justify-center rounded-full px-2 py-1 font-label-sm text-label-sm", statusClasses[status])}>
                          {statusLabels[status]}
                        </span>
                      </Td>
                    ))}
                    <Td className="text-center tabular-nums font-medium text-secondary">{row.presentCount}</Td>
                    <Td className="text-center tabular-nums text-error">{row.absentCount}</Td>
                    <Td className="text-center font-medium tabular-nums text-on-surface">%{row.attendanceRate}</Td>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </TeacherLayout>
  );
}
