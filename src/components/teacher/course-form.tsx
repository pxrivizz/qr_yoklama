"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { StatusMessage } from "@/components/ui/status-message";

type EditableCourse = {
  id: string;
  name: string;
  code: string;
  schoolLat: number;
  schoolLng: number;
  allowedRadiusMeters: number;
  allowedIpRanges: string[];
  weeklySessionCount: number;
  totalWeeks: number;
  mandatoryAlertLimit: number | null;
};

type CourseFormProps = {
  course?: EditableCourse;
  initialValues?: { name?: string; code?: string };
  enrollmentFile?: File;
  importedStudentCount?: number;
  onSaved?: () => void;
};

type ApiErrorBody = {
  data?: { id?: string };
  error?: { message?: string };
};

export function CourseForm({
  course,
  initialValues,
  enrollmentFile,
  importedStudentCount,
  onSaved,
}: CourseFormProps) {
  const router = useRouter();
  const [name, setName] = useState(course?.name ?? initialValues?.name ?? "");
  const [code, setCode] = useState(course?.code ?? initialValues?.code ?? "");
  const [weeklyCount, setWeeklyCount] = useState(course?.weeklySessionCount ?? 3);
  const [totalWeeks, setTotalWeeks] = useState(course?.totalWeeks ?? 9);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ text: string; variant: "success" | "error" }>();
  const isEditing = Boolean(course);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(undefined);

    const form = event.currentTarget;
    const values = new FormData(form);
    const mandatoryLimit = String(values.get("mandatoryAlertLimit") ?? "").trim();
    const payload = {
      name: String(values.get("name")),
      code: String(values.get("code")),
      schoolLat: Number(values.get("schoolLat")),
      schoolLng: Number(values.get("schoolLng")),
      allowedRadiusMeters: Number(values.get("allowedRadiusMeters")),
      allowedIpRanges: String(values.get("allowedIpRanges"))
        .split(/[\n,]+/)
        .map((value) => value.trim())
        .filter(Boolean),
      weeklySessionCount: Number(values.get("weeklySessionCount")),
      totalWeeks: Number(values.get("totalWeeks")),
      mandatoryAlertLimit: mandatoryLimit ? Number(mandatoryLimit) : null,
    };

    try {
      const response = await fetch(course ? `/api/courses/${course.id}` : "/api/courses", {
        method: course ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as ApiErrorBody;

      if (!response.ok) {
        throw new Error(body.error?.message ?? "Ders kaydedilemedi.");
      }

      const createdCourseId = !isEditing ? body.data?.id : undefined;
      if (enrollmentFile) {
        if (!createdCourseId) {
          throw new Error("Ders oluşturuldu ancak öğrenci aktarımı başlatılamadı.");
        }

        const upload = new FormData();
        upload.set("file", enrollmentFile);
        const importResponse = await fetch(
          `/api/courses/${createdCourseId}/enrollments/import`,
          { method: "POST", body: upload },
        );
        const importBody = (await importResponse.json()) as ApiErrorBody;
        if (!importResponse.ok) {
          const rollbackResponse = await fetch(`/api/courses/${createdCourseId}`, {
            method: "DELETE",
          });
          const suffix = rollbackResponse.ok
            ? " Oluşturulan boş ders geri alındı."
            : " Ders oluşturuldu; öğrenci listesini ders ayarlarından tekrar yükleyin.";
          throw new Error(
            `${importBody.error?.message ?? "Öğrenci listesi kaydedilemedi."}${suffix}`,
          );
        }
      }

      setMessage({
        text: isEditing
          ? "Ders güncellendi."
          : enrollmentFile
            ? `Ders ve ${importedStudentCount ?? "Excel'deki"} öğrenci oluşturuldu.`
            : "Ders oluşturuldu.",
        variant: "success",
      });
      if (!isEditing) {
        form.reset();
        setName("");
        setCode("");
        setWeeklyCount(3);
        setTotalWeeks(9);
      }
      router.refresh();
      onSaved?.();
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "Ders kaydedilemedi.",
        variant: "error",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input name="name" label="Ders adı" required autoFocus={!course} value={name} onChange={(event) => setName(event.target.value)} placeholder="Web Programlama" />
        <Input name="code" label="Ders kodu" required value={code} onChange={(event) => setCode(event.target.value)} placeholder="WEB-101" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input name="schoolLat" label="Okul enlemi" required type="number" step="any" defaultValue={course?.schoolLat ?? 41.424793} />
        <Input name="schoolLng" label="Okul boylamı" required type="number" step="any" defaultValue={course?.schoolLng ?? 27.087227} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Input name="allowedRadiusMeters" label="Yarıçap (m)" required type="number" min="10" max="2000" defaultValue={course?.allowedRadiusMeters ?? 1000} />
        <Input
          name="weeklySessionCount"
          label="Haftalık yoklama"
          required
          type="number"
          min="1"
          max="10"
          value={weeklyCount}
          onChange={(event) => setWeeklyCount(Number(event.target.value))}
        />
        <Input
          name="totalWeeks"
          label="Toplam hafta"
          required
          type="number"
          min="1"
          max="52"
          value={totalWeeks}
          onChange={(event) => setTotalWeeks(Number(event.target.value))}
        />
      </div>

      <Textarea
        name="allowedIpRanges"
        label="İzin verilen IP aralıkları"
        required
        rows={2}
        defaultValue={course?.allowedIpRanges.join("\n") ?? "10.0.0.0/8"}
        placeholder="10.20.0.0/16"
        hint="Her satıra bir IPv4 veya IPv6 CIDR aralığı."
      />

      <Input
        name="mandatoryAlertLimit"
        label="Zorunlu öğrenci uyarı eşiği"
        type="number"
        min="1"
        max="100"
        defaultValue={course?.mandatoryAlertLimit ?? ""}
        placeholder="Örn. 4"
        className="sm:max-w-xs"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant pt-4">
        <p className="font-body-md text-body-md text-on-surface-variant">
          Planlanan toplam: <span className="font-semibold text-on-surface">{weeklyCount * totalWeeks} oturum</span>
        </p>
        <Button type="submit" disabled={pending}>
          {pending
            ? enrollmentFile ? "Ders ve öğrenciler kaydediliyor…" : "Kaydediliyor…"
            : isEditing
              ? "Değişiklikleri kaydet"
              : enrollmentFile
                ? "Ders ve öğrencileri oluştur"
                : "Dersi oluştur"}
        </Button>
      </div>

      {message && (
        <StatusMessage variant={message.variant === "success" ? "success" : "error"}>
          {message.text}
        </StatusMessage>
      )}
    </form>
  );
}
