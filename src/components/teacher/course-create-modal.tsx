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
import { importedCourseName } from "@/lib/courses/imported-course-name";

export function CourseCreateModal() {
  const [open, setOpen] = useState(false);
  const [preparedImport, setPreparedImport] = useState<PreparedCourseImport>();
  const [activeSection, setActiveSection] = useState("#new-course-details");

  function closeModal() {
    setOpen(false);
    setPreparedImport(undefined);
    setActiveSection("#new-course-details");
  }

  return (
    <>
      <Button type="button" className="gap-2" onClick={() => setOpen(true)}>
        <MaterialIcon name="add" /> Yeni ders
      </Button>
      <Modal
        open={open}
        onClose={closeModal}
        title="Yeni ders ekle"
        description="Ders bilgilerini ve yoklama kurallarını belirleyin."
        className="max-w-6xl"
      >
        <div className="-m-5 sm:-m-6">
          <nav aria-label="Yeni ders bölümleri" className="flex gap-6 overflow-x-auto border-b border-outline-variant px-4 sm:px-5 lg:px-6">
            {[
              ["#new-course-details", "Ders bilgileri"],
              ["#new-course-location", "Konum ve erişim"],
              ["#new-course-students", "Öğrenciler"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                onClick={() => setActiveSection(href)}
                aria-current={activeSection === href ? "location" : undefined}
                className={`shrink-0 border-b-2 px-1 py-3 font-label-sm text-label-sm transition-colors ${
                  activeSection === href
                    ? "border-secondary text-on-surface"
                    : "border-transparent text-on-surface-variant hover:border-outline hover:text-on-surface"
                }`}
              >
                {label}
              </a>
            ))}
          </nav>
          <CourseForm
            initialValues={{
              name: importedCourseName(
                preparedImport?.metadata?.courseName,
                preparedImport?.metadata?.branchCode,
              ),
              code: preparedImport?.metadata?.courseCode,
            }}
            enrollmentFile={preparedImport?.file}
            importedStudentCount={preparedImport?.summary.valid}
            onSaved={closeModal}
            onCancel={closeModal}
            presentation="create"
            supplementaryContent={<CourseExcelImport compact onPrepared={setPreparedImport} />}
          />
        </div>
      </Modal>
    </>
  );
}
