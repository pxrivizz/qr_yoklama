"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusMessage } from "@/components/ui/status-message";

export function StudentNumberForm({
  defaultValue,
  onSuccess,
  onCancel,
}: {
  defaultValue?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ text: string; variant: "success" | "error" }>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(undefined);
    const schoolNumber = String(new FormData(event.currentTarget).get("schoolNumber") ?? "");

    try {
      const response = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ schoolNumber }),
      });
      const body = (await response.json()) as {
        data?: { matchedCount: number };
        error?: { message?: string };
      };
      if (!response.ok) throw new Error(body.error?.message ?? "Öğrenci kaydı doğrulanamadı.");

      setMessage({
        text: `${body.data?.matchedCount ?? 0} ders kaydınız hesabınızla eşleştirildi.`,
        variant: "success",
      });
      onSuccess?.();
      router.refresh();
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "Öğrenci kaydı doğrulanamadı.",
        variant: "error",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <Input
        name="schoolNumber"
        label="Öğrenci numarası"
        required
        autoComplete="off"
        defaultValue={defaultValue ?? ""}
        placeholder="Örn. 221601045"
        hint="Numara ve Google hesabınızdaki ad soyad, öğretmenin yüklediği listeyle birlikte doğrulanır."
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="lg" disabled={pending} className="flex-1">
          {pending ? "Doğrulanıyor…" : "Derslerimi doğrula"}
        </Button>
        {onCancel && (
          <Button type="button" size="lg" variant="secondary" onClick={onCancel} disabled={pending}>
            Vazgeç
          </Button>
        )}
      </div>
      {message && <StatusMessage variant={message.variant}>{message.text}</StatusMessage>}
    </form>
  );
}
