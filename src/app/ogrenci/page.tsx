import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { StudentProfileSection } from "@/components/student/student-profile-section";
import { StudentNotifications } from "@/components/student/student-notifications";
import { ActiveAttendanceBanner } from "@/components/student/active-attendance-banner";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MaterialIcon } from "@/components/ui/icons";
import { prisma } from "@/lib/db";
import { listStudentCourses } from "@/lib/students/service";
import { getStudentActiveSessions } from "@/lib/attendance/session-service";

type StudentPageProps = {
  searchParams?: Promise<{ uyari?: string }>;
};

export default async function StudentPage({ searchParams }: StudentPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");
  if (session.user.role !== "STUDENT") redirect("/ogretmen");

  const [student, enrollments, activeSessions, params] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, schoolNumber: true, image: true },
    }),
    listStudentCourses(session.user.id),
    getStudentActiveSessions(session.user.id),
    searchParams,
  ]);
  if (!student) redirect("/giris");

  const uyari = params?.uyari;
  const isPhotoMissing = !student.image;

  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b border-outline-variant bg-surface-container-lowest/80 backdrop-blur-lg sticky top-0 z-20">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
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


      <div className="mx-auto grid max-w-3xl gap-6 px-4 py-8 sm:px-6 sm:py-12 animate-fade-in-up stagger-children">
        {uyari === "fotograf_gerekli" && (
          <div className="flex items-start gap-3 rounded-2xl border border-error-container bg-error-container/30 p-4 text-on-error-container shadow-sm">
            <MaterialIcon name="error" className="mt-0.5 text-xl text-error" />
            <div>
              <p className="font-semibold">Yoklama İçin Profil Fotoğrafı Zorunludur</p>
              <p className="mt-0.5 font-body-sm text-body-sm">
                QR kod okutarak yoklamaya katılabilmek için lütfen profil fotoğrafınızı yükleyin.
              </p>
            </div>
          </div>
        )}

        {uyari === "numara_gerekli" && (
          <div className="flex items-start gap-3 rounded-2xl border border-error-container bg-error-container/30 p-4 text-on-error-container shadow-sm">
            <MaterialIcon name="error" className="mt-0.5 text-xl text-error" />
            <div>
              <p className="font-semibold">Öğrenci Numarası Doğrulanmalıdır</p>
              <p className="mt-0.5 font-body-sm text-body-sm">
                Yoklamaya katılabilmek için öğrenci numaranızı doğrulamanız gerekmektedir.
              </p>
            </div>
          </div>
        )}

        {isPhotoMissing && !uyari && (
          <div className="flex items-start gap-3 rounded-2xl border border-error-container bg-error-container/20 p-4 text-on-error-container shadow-sm">
            <MaterialIcon name="warning" className="mt-0.5 text-xl text-error" />
            <div>
              <p className="font-semibold">Profil Fotoğrafı Eksik (Zorunlu)</p>
              <p className="mt-0.5 font-body-sm text-body-sm">
                Yoklama güvenliği kapsamında öğrencilerin profil fotoğrafı eklemesi zorunludur. Lütfen aşağıdaki alandan fotoğrafınızı yükleyin.
              </p>
            </div>
          </div>
        )}

        {/* Aktif Yoklama Oturumu Bildirimi */}
        <ActiveAttendanceBanner initialSessions={activeSessions} />

        <section>
          <p className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Öğrenci paneli</p>
          <h1 className="mt-2 font-h1 text-h1 text-on-surface">Merhaba, {student.name ?? "öğrenci"}</h1>
          <p className="mt-2 font-body-lg text-body-lg text-on-surface-variant">
            Profil bilgilerinizi yönetin ve ders yoklamalarına katılın.
          </p>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink href="/tara" size="lg" className="w-full gap-2 sm:w-fit btn-lift press-scale shadow-sm hover:shadow">
            <MaterialIcon name="qr_code_scanner" /> QR kodunu okut
          </ButtonLink>
        </div>

        <StudentProfileSection student={student} />

        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-h3 text-h3 text-on-surface">Derslerim</h2>
            <span className="text-xs text-on-surface-variant">
              Detay ve yoklama geçmişi için derse tıklayın
            </span>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            {enrollments.length === 0 ? (
              <EmptyState
                title="Henüz doğrulanmış dersiniz yok"
                description="Öğrenci numaranızı doğruladığınızda dersleriniz ve yoklama kayıtlarınız burada listelenecektir."
              />
            ) : (
              enrollments.map((enrollment) => {
                const activeForCourse = activeSessions.find(
                  (s) => s.courseId === enrollment.course.id,
                );
                const hasPendingActive = activeForCourse && !activeForCourse.alreadyAttended;
                const attendedActive = activeForCourse && activeForCourse.alreadyAttended;

                return (
                  <Link
                    key={enrollment.id}
                    href={`/ogrenci/ders/${enrollment.course.id}`}
                    className="card-hover flex flex-col gap-3 border-b border-outline-variant px-5 py-4 transition-colors last:border-b-0 hover:bg-surface-container/50 sm:flex-row sm:items-center sm:justify-between group block"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-label-sm text-label-sm font-semibold text-secondary">
                          {enrollment.course.code}
                        </span>
                        {enrollment.isMandatory && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-label-sm text-[11px] font-medium text-primary">
                            Zorunlu
                          </span>
                        )}
                        {hasPendingActive && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-300 animate-pulse">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            Yoklama Başlatıldı!
                          </span>
                        )}
                        {attendedActive && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                            <MaterialIcon name="check" className="text-xs" />
                            Oturuma Katıldınız
                          </span>
                        )}
                      </div>

                      <h3 className="mt-1 font-medium text-on-surface group-hover:text-primary transition-colors flex items-center gap-1">
                        {enrollment.course.name}
                      </h3>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface-variant">
                        <span>
                          Katılım: <strong className="text-on-surface">{enrollment.attendedCount} / {enrollment.totalClosedSessions}</strong> oturum
                        </span>
                        <span>•</span>
                        <span>
                          Devamsızlık: <strong className={enrollment.isFailed || enrollment.isAtLimit ? "text-error font-semibold" : "text-on-surface"}>{enrollment.absentCount}</strong> oturum
                          {enrollment.course.mandatoryAlertLimit !== null && (
                            <span className="text-neutral-400"> (Sınır: {enrollment.course.mandatoryAlertLimit})</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2.5">
                      {enrollment.isFailed ? (
                        <Badge variant="error" className="gap-1 bg-red-100 text-red-900 border-red-300 font-bold px-2.5 py-1">
                          <MaterialIcon name="cancel" className="text-sm text-red-700" />
                          Kaldın ({enrollment.absentCount}/{enrollment.course.mandatoryAlertLimit})
                        </Badge>
                      ) : enrollment.isAtLimit ? (
                        <Badge variant="error" className="gap-1 px-2.5 py-1 font-semibold">
                          <MaterialIcon name="warning" className="text-sm" />
                          Sınırda ({enrollment.absentCount}/{enrollment.course.mandatoryAlertLimit})
                        </Badge>
                      ) : enrollment.isNearLimit ? (
                        <Badge variant="warning" className="gap-1 px-2.5 py-1 font-medium">
                          <MaterialIcon name="error_outline" className="text-sm" />
                          Kritik (Son 1 Hak)
                        </Badge>
                      ) : enrollment.course.mandatoryAlertLimit !== null ? (
                        <Badge variant="success" className="px-2.5 py-1">
                          Güvenli ({enrollment.absentCount}/{enrollment.course.mandatoryAlertLimit})
                        </Badge>
                      ) : (
                        <Badge variant="default" className="px-2.5 py-1">
                          %{enrollment.attendanceRate} Katılım
                        </Badge>
                      )}

                      <span className="grid size-8 place-items-center rounded-lg text-neutral-400 group-hover:text-neutral-900 group-hover:bg-neutral-100 transition-colors">
                        <MaterialIcon name="chevron_right" className="text-xl" />
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
