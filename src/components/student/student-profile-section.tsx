"use client";

import { useState } from "react";

import { StudentNumberForm } from "@/components/student/student-number-form";
import { StudentPhotoUpload } from "@/components/student/student-photo-upload";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between border-b border-outline-variant pb-4">
        <div>
          <h2 className="font-h3 text-h3 text-on-surface">Öğrenci Profilim</h2>
          <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
            Yoklama güvenliği için fotoğraf ve öğrenci numarası bilgilerinizi yönetin.
          </p>
        </div>
      </div>

      <div className="grid gap-6 pt-5">
        <div>
          <StudentPhotoUpload currentImage={student.image} />
        </div>

        <div className="h-px bg-outline-variant" />

        <div>
          {isNumberVerified ? (
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                    <MaterialIcon name="verified" className="text-2xl" />
                  </div>
                  <div>
                    <p className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">
                      Öğrenci Numarası (Doğrulandı)
                    </p>
                    <p className="font-title-md text-title-md font-medium text-on-surface">
                      {student.schoolNumber}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditingNumber(!isEditingNumber)}
                  className="gap-1"
                >
                  <MaterialIcon name={isEditingNumber ? "close" : "edit"} className="text-base" />
                  {isEditingNumber ? "Formu Kapat" : "Numarayı Güncelle"}
                </Button>
              </div>

              {isEditingNumber && (
                <div className="rounded-lg border border-outline-variant bg-surface-container/30 p-4">
                  <p className="mb-3 font-body-sm text-body-sm text-on-surface-variant">
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
              <div className="flex items-start gap-3 rounded-lg border border-error-container bg-error-container/20 p-4 text-on-error-container">
                <MaterialIcon name="info" className="mt-0.5 text-xl text-error" />
                <div>
                  <p className="font-medium">Öğrenci Numarası Doğrulanmadı</p>
                  <p className="mt-0.5 font-body-sm text-body-sm">
                    Derslerinizle eşleşebilmek ve yoklama alabilmek için okul numaranızı yazıp doğrulayın.
                  </p>
                </div>
              </div>

              <StudentNumberForm defaultValue={student.schoolNumber} />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
