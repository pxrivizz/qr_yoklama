"use client";

import { useState } from "react";

import { CourseForm } from "@/components/teacher/course-form";
import {
  CourseExcelImport,
  type PreparedCourseImport,
} from "@/components/teacher/course-excel-import";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";

export function CourseCreateModal() {
  const [open, setOpen] = useState(false);
  const [preparedImport, setPreparedImport] = useState<PreparedCourseImport>();

  function closeModal() {
    setOpen(false);
    setPreparedImport(undefined);
  }

  return (
    <>
      <Button type="button" className="gap-2" onClick={() => setOpen(true)}>
        <MaterialIcon name="add" /> Yeni ders
      </Button>
      <Modal
        open={open}
        onClose={closeModal}
        title="Yeni ders oluştur"
        description="Excel listesinden ders ve öğrencileri getirin veya bilgileri elle girin."
      >
        <div className="grid gap-6">
          <CourseExcelImport onPrepared={setPreparedImport} />
          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-outline-variant" />
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
              Ders bilgileri
            </span>
            <span className="h-px flex-1 bg-outline-variant" />
          </div>
          <CourseForm
            key={`${preparedImport?.metadata?.courseCode ?? "manual"}-${preparedImport?.file.name ?? "none"}`}
            initialValues={{
              name: preparedImport?.metadata?.courseName,
              code: preparedImport?.metadata?.courseCode,
            }}
            enrollmentFile={preparedImport?.file}
            importedStudentCount={preparedImport?.summary.valid}
            onSaved={closeModal}
          />
        </div>
      </Modal>
    </>
  );
}
