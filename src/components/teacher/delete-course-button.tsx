"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatusMessage } from "@/components/ui/status-message";

type DeleteCourseButtonProps = {
  courseId: string;
  courseCode: string;
  courseName: string;
  attendanceSessionCount: number;
  enrollmentCount: number;
};

export function DeleteCourseButton({
  courseId,
  courseName,
  attendanceSessionCount,
  enrollmentCount,
}: DeleteCourseButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function removeCourse() {
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/courses/${courseId}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json()) as { error?: { message?: string } };
        throw new Error(body.error?.message ?? "Ders arşivlenemedi.");
      }
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ders arşivlenemedi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="danger"
        size="sm"
        onClick={() => {
          setError(undefined);
          setOpen(true);
        }}
      >
        Arşivle
      </Button>
      <Modal
        open={open}
        onClose={() => !pending && setOpen(false)}
        title="Dersi arşivlemek istiyor musunuz?"
        description={`${courseName} aktif listelerden kaldırılır; öğrenci ve yoklama geçmişi korunur.`}
        className="max-w-md"
      >
        <div className="grid gap-5">
          {error && <StatusMessage variant="error">{error}</StatusMessage>}
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4 text-on-surface-variant">
            {attendanceSessionCount} yoklama oturumu ve {enrollmentCount} öğrenci kaydı arşivde
            saklanacak. Aktif bir yoklama varsa önce kapatmanız gerekir.
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button
              type="button"
              variant="critical"
              disabled={pending}
              onClick={removeCourse}
            >
              {pending ? "Arşivleniyor…" : "Dersi arşivle"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
