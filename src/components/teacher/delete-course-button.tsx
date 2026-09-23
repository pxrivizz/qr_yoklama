"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatusMessage } from "@/components/ui/status-message";

export function DeleteCourseButton({ courseId }: { courseId: string }) {
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
        throw new Error(body.error?.message ?? "Ders silinemedi.");
      }
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ders silinemedi.");
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
        Sil
      </Button>
      <Modal
        open={open}
        onClose={() => !pending && setOpen(false)}
        title="Dersi silmek istiyor musunuz?"
        description="Bu işlem dersin yoklama oturumlarını ve öğrenci listesini de kalıcı olarak siler."
        className="max-w-md"
      >
        <div className="grid gap-5">
          {error && <StatusMessage variant="error">{error}</StatusMessage>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button type="button" variant="critical" disabled={pending} onClick={removeCourse}>
              {pending ? "Siliniyor…" : "Dersi kalıcı olarak sil"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
