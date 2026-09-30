"use client";

import { useState } from "react";

import { StudentNumberForm } from "@/components/student/student-number-form";
import { StudentPhotoUpload } from "@/components/student/student-photo-upload";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/icons";

type StudentProfileSectionProps = {
  student: {
    name: string | null;
    email: string;
    schoolNumber: string | null;
    image: string | null;
  };
};

export function StudentProfileSection({ student }: StudentProfileSectionProps) {
  const [isEditingNumber, setIsEditingNumber] = useState(false);
  const isNumberVerified = Boolean(student.schoolNumber);

  return (
    <section
      aria-labelledby="student-profile-heading"
      className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0_8px_24px_rgba(25,28,30,0.06)]"
    >
      <header className="flex flex-col gap-3 border-b border-outline-variant bg-surface-container-low/55 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-outline-variant bg-surface-container-lowest text-primary shadow-sm">
            <MaterialIcon name="badge" className="text-xl" />
          </div>
          <div className="min-w-0">
            <h2 id="student-profile-heading" className="font-h3 text-h3 text-on-surface">
              Öğrenci Profili
            </h2>
            <p className="mt-0.5 text-sm font-medium text-on-surface [overflow-wrap:anywhere]">
              {student.name ?? "Öğrenci"}
            </p>
            <p className="text-sm text-on-surface-variant [overflow-wrap:anywhere]">
              {student.email}
            </p>
          </div>
        </div>

        <p className="max-w-xs text-sm leading-5 text-on-surface-variant sm:text-right">
          Yoklamaya katılabilmek için fotoğrafınızı ve öğrenci numaranızı güncel tutun.
        </p>
      </header>

      <div className="grid md:grid-cols-[1.15fr_0.85fr]">
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <StudentPhotoUpload currentImage={student.image} />
        </div>

        <div className="border-t border-outline-variant px-5 py-5 sm:px-6 sm:py-6 md:border-l md:border-t-0">
          {isNumberVerified ? (
            <div className="grid h-full content-start gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-secondary">
                    <MaterialIcon name="verified" filled className="text-lg" />
                    <p className="text-sm font-semibold">Doğrulanmış numara</p>
                  </div>
                  <p className="mt-2 font-title-md text-title-md font-semibold tabular-nums text-on-surface">
                    {student.schoolNumber}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-on-surface-variant">
                    Ders kayıtlarınız bu numarayla eşleştiriliyor.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditingNumber(!isEditingNumber)}
                  aria-expanded={isEditingNumber}
                  className="min-h-11 gap-1.5"
                >
                  <MaterialIcon name={isEditingNumber ? "close" : "edit"} className="text-base" />
                  {isEditingNumber ? "Formu Kapat" : "Numarayı Güncelle"}
                </Button>
              </div>

              {isEditingNumber && (
                <div className="border-t border-outline-variant pt-4">
                  <p className="mb-3 text-sm leading-5 text-on-surface-variant">
                    Numaranızı güncellediğinizde kayıtlı dersleriniz yeniden eşleştirilecektir:
                  </p>
                  <StudentNumberForm
                    defaultValue={student.schoolNumber}
                    onSuccess={() => setIsEditingNumber(false)}
                    onCancel={() => setIsEditingNumber(false)}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="flex items-start gap-3 rounded-lg bg-error-container/35 p-4 text-on-error-container">
                <MaterialIcon name="error" className="mt-0.5 text-xl text-error" />
                <div>
                  <p className="font-medium">Öğrenci numarası doğrulanmadı</p>
                  <p className="mt-1 text-sm leading-5">
                    Derslerinizle eşleşmek ve yoklamaya katılmak için okul numaranızı doğrulayın.
                  </p>
                </div>
              </div>

              <StudentNumberForm defaultValue={student.schoolNumber} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
