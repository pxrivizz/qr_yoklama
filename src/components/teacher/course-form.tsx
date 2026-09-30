"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { StatusMessage } from "@/components/ui/status-message";
import { CourseLocationNetwork } from "@/components/teacher/course-location-network";
import { WEEKDAYS, type PreparatoryDayPlan } from "@/lib/attendance/slot";

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
  attendanceMode: "STANDARD" | "PREPARATORY";
  preparatoryDayPlans: PreparatoryDayPlan[];
  mandatoryAlertLimit: number | null;
  _count?: { attendanceSessions: number };
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
  error?: { message?: string; fields?: Record<string, string[] | undefined> };
};

type FieldErrors = Record<string, string>;

function validateCourseFields(
  values: FormData,
  ipRestrictionEnabled: boolean,
  attendanceMode: "STANDARD" | "PREPARATORY",
): FieldErrors {
  const errors: FieldErrors = {};
  const requiredFields: Array<readonly [string, string]> = [
    ["name", "Ders adı"],
    ["code", "Ders kodu"],
    ["schoolLat", "Okul enlemi"],
    ["schoolLng", "Okul boylamı"],
    ["allowedRadiusMeters", "Yarıçap"],
    ["totalWeeks", "Toplam hafta"],
    ["mandatoryAlertLimit", "Devamsızlık hakkı"],
  ];

  if (attendanceMode === "STANDARD") {
    requiredFields.push(["weeklySessionCount", "Haftalık yoklama"]);
  }

  if (ipRestrictionEnabled) {
    requiredFields.push(["allowedIpRanges", "İzin verilen IP aralıkları"]);
  }

  for (const [field, label] of requiredFields) {
    if (!String(values.get(field) ?? "").trim()) {
      errors[field] = `${label} boş bırakılamaz.`;
    }
  }

  const numericRules = [
    ["schoolLat", -90, 90, "Okul enlemi -90 ile 90 arasında olmalıdır."],
    ["schoolLng", -180, 180, "Okul boylamı -180 ile 180 arasında olmalıdır."],
    ["allowedRadiusMeters", 10, 2_000, "Yarıçap 10 ile 2000 metre arasında olmalıdır."],
    ["totalWeeks", 1, 52, "Toplam hafta 1 ile 52 arasında olmalıdır."],
    ["mandatoryAlertLimit", 1, 100, "Devamsızlık hakkı 1 ile 100 arasında olmalıdır."],
  ] as const;

  const rules = attendanceMode === "STANDARD"
    ? [
        ...numericRules,
        ["weeklySessionCount", 1, 10, "Haftalık yoklama 1 ile 10 arasında olmalıdır."] as const,
      ]
    : numericRules;

  for (const [field, minimum, maximum, message] of rules) {
    if (errors[field]) continue;
    const value = Number(values.get(field));
    if (!Number.isFinite(value) || value < minimum || value > maximum) {
      errors[field] = message;
    }
  }

  return errors;
}

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
  const [attendanceMode, setAttendanceMode] = useState<"STANDARD" | "PREPARATORY">(
    course?.attendanceMode ?? "STANDARD",
  );
  const [preparatoryDayPlans, setPreparatoryDayPlans] = useState<PreparatoryDayPlan[]>(
    () => WEEKDAYS.map(({ weekday }) => ({
      weekday,
      lessonCount: course?.preparatoryDayPlans.find((plan) => plan.weekday === weekday)?.lessonCount ?? 0,
    })),
  );
  const preparatoryWeeklyTotal = preparatoryDayPlans.reduce(
    (total, plan) => total + plan.lessonCount,
    0,
  );
  const [schoolLat, setSchoolLat] = useState(course?.schoolLat ?? 41.424793);
  const [schoolLng, setSchoolLng] = useState(course?.schoolLng ?? 27.087227);
  const [allowedIpRanges, setAllowedIpRanges] = useState(
    course?.allowedIpRanges.join("\n") || "10.0.0.0/8",
  );
  const [ipRestrictionEnabled, setIpRestrictionEnabled] = useState(
    course ? course.allowedIpRanges.length > 0 : true,
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ text: string; variant: "success" | "error" }>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const isEditing = Boolean(course);

  function clearFieldError(field: string) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);

    const form = event.currentTarget;
    const values = new FormData(form);
    const validationErrors = validateCourseFields(values, ipRestrictionEnabled, attendanceMode);
    if (attendanceMode === "PREPARATORY" && preparatoryWeeklyTotal === 0) {
      validationErrors.preparatoryDayPlans = "En az bir gün için ders sayısı girin.";
    }
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setMessage({
        text: "Dersi kaydetmeden önce işaretlenen zorunlu alanları doldurun.",
        variant: "error",
      });
      const firstInvalidField = Object.keys(validationErrors)[0];
      (form.elements.namedItem(firstInvalidField) as HTMLElement | null)?.focus();
      return;
    }

    setFieldErrors({});
    setPending(true);
    const mandatoryLimit = String(values.get("mandatoryAlertLimit") ?? "").trim();
    const payload = {
      name: String(values.get("name")),
      code: String(values.get("code")),
      schoolLat: Number(values.get("schoolLat")),
      schoolLng: Number(values.get("schoolLng")),
      allowedRadiusMeters: Number(values.get("allowedRadiusMeters")),
      allowedIpRanges: ipRestrictionEnabled
        ? String(values.get("allowedIpRanges"))
            .split(/[\n,]+/)
            .map((value) => value.trim())
            .filter(Boolean)
        : [],
      weeklySessionCount: attendanceMode === "PREPARATORY"
        ? preparatoryWeeklyTotal
        : Number(values.get("weeklySessionCount")),
      totalWeeks: Number(values.get("totalWeeks")),
      attendanceMode,
      preparatoryDayPlans: attendanceMode === "PREPARATORY" ? preparatoryDayPlans : [],
      mandatoryAlertLimit: Number(mandatoryLimit),
    };

    try {
      const response = await fetch(course ? `/api/courses/${course.id}` : "/api/courses", {
        method: course ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as ApiErrorBody;

      if (!response.ok) {
        if (body.error?.fields) {
          const apiFieldErrors = Object.fromEntries(
            Object.entries(body.error.fields)
              .map(([field, errors]) => [field, errors?.find(Boolean)])
              .filter((entry): entry is [string, string] => Boolean(entry[1])),
          );
          setFieldErrors(apiFieldErrors);
        }
        const fieldMessage = body.error?.fields
          ? Object.values(body.error.fields).flat().find(Boolean)
          : undefined;
        throw new Error(fieldMessage ?? body.error?.message ?? "Ders kaydedilemedi.");
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
        setAttendanceMode("STANDARD");
        setPreparatoryDayPlans(WEEKDAYS.map(({ weekday }) => ({ weekday, lessonCount: 0 })));
        setSchoolLat(41.424793);
        setSchoolLng(27.087227);
        setAllowedIpRanges("10.0.0.0/8");
        setIpRestrictionEnabled(true);
        setFieldErrors({});
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
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input name="name" label="Ders adı" required autoFocus={!course} value={name} error={fieldErrors.name} onChange={(event) => { setName(event.target.value); clearFieldError("name"); }} placeholder="Web Programlama" />
        <Input name="code" label="Ders kodu" required value={code} error={fieldErrors.code} onChange={(event) => { setCode(event.target.value); clearFieldError("code"); }} placeholder="WEB-101" />
      </div>

      <CourseLocationNetwork
        latitude={schoolLat}
        longitude={schoolLng}
        onLocationChange={(latitude, longitude) => {
          setSchoolLat(latitude);
          setSchoolLng(longitude);
          clearFieldError("schoolLat");
          clearFieldError("schoolLng");
        }}
        onIpAddressChange={(cidr) => {
          setAllowedIpRanges(cidr);
          setIpRestrictionEnabled(true);
          clearFieldError("allowedIpRanges");
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input name="schoolLat" label="Okul enlemi" required type="number" step="any" value={schoolLat} error={fieldErrors.schoolLat} onChange={(event) => { setSchoolLat(Number(event.target.value)); clearFieldError("schoolLat"); }} />
        <Input name="schoolLng" label="Okul boylamı" required type="number" step="any" value={schoolLng} error={fieldErrors.schoolLng} onChange={(event) => { setSchoolLng(Number(event.target.value)); clearFieldError("schoolLng"); }} />
      </div>

      <div className={`grid gap-4 ${attendanceMode === "PREPARATORY" ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        <Input name="allowedRadiusMeters" label="Yarıçap (m)" required type="number" min="10" max="2000" defaultValue={course?.allowedRadiusMeters ?? 100} error={fieldErrors.allowedRadiusMeters} onChange={() => clearFieldError("allowedRadiusMeters")} />
        {attendanceMode === "STANDARD" && (
          <Input
            name="weeklySessionCount"
            label="Haftalık yoklama"
            required
            type="number"
            min="1"
            max="10"
            value={weeklyCount}
            error={fieldErrors.weeklySessionCount}
            onChange={(event) => { setWeeklyCount(Number(event.target.value)); clearFieldError("weeklySessionCount"); }}
          />
        )}
        <Input
          name="totalWeeks"
          label="Toplam hafta"
          required
          type="number"
          min="1"
          max="52"
          value={totalWeeks}
          error={fieldErrors.totalWeeks}
          onChange={(event) => { setTotalWeeks(Number(event.target.value)); clearFieldError("totalWeeks"); }}
        />
      </div>

      <div className="grid gap-4 rounded-lg border border-outline-variant bg-surface-container-low p-4 sm:grid-cols-2">
        <label className="block font-label-sm text-label-sm text-on-surface">
          Hazırlık sınıfı mı?
          <select
            name="attendanceMode"
            value={attendanceMode}
            disabled={Boolean(course?._count?.attendanceSessions)}
            onChange={(event) => {
              setAttendanceMode(event.target.value as "STANDARD" | "PREPARATORY");
              clearFieldError("preparatoryDayPlans");
              clearFieldError("weeklySessionCount");
            }}
            className="mt-1.5 min-h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 font-body-md text-body-md text-on-surface outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="STANDARD">Hayır — normal ders</option>
            <option value="PREPARATORY">Evet — hazırlık sınıfı</option>
          </select>
          <span className="mt-1.5 block font-body-sm text-body-sm text-on-surface-variant">
            {course?._count?.attendanceSessions
              ? "Yoklama geçmişi bulunduğu için sınıf türü değiştirilemez."
              : "Hazırlık sınıflarında yoklama tarih ve o günkü ders sırasına göre tutulur."}
          </span>
        </label>

        {attendanceMode === "PREPARATORY" && (
          <div className="sm:col-span-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="font-label-md text-label-md text-on-surface">Günlere göre ders sayısı</h3>
                <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                  Her gün yapılacak toplam ders adedini girin. Ders olmayan günleri 0 bırakın.
                </p>
              </div>
              <p className="font-label-sm text-label-sm tabular-nums text-on-surface-variant">
                Haftalık toplam: <strong className="text-on-surface">{preparatoryWeeklyTotal} ders</strong>
              </p>
            </div>
            <div className="mt-4 divide-y divide-outline-variant overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
              {WEEKDAYS.map(({ weekday, label }) => {
                const plan = preparatoryDayPlans.find((item) => item.weekday === weekday)!;
                return (
                  <label key={weekday} className="flex min-h-14 items-center justify-between gap-4 px-4 py-2 text-on-surface">
                    <span className="font-body-md text-body-md">{label}</span>
                    <span className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="16"
                        inputMode="numeric"
                        aria-label={`${label} ders sayısı`}
                        value={plan.lessonCount}
                        onChange={(event) => {
                          const lessonCount = Math.max(0, Math.min(16, Number(event.target.value)));
                          setPreparatoryDayPlans((current) => current.map((item) =>
                            item.weekday === weekday ? { ...item, lessonCount } : item,
                          ));
                          clearFieldError("preparatoryDayPlans");
                        }}
                        className="min-h-10 w-20 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-center font-body-md text-body-md tabular-nums outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                      />
                      <span className="w-10 font-body-sm text-body-sm text-on-surface-variant">ders</span>
                    </span>
                  </label>
                );
              })}
            </div>
            {fieldErrors.preparatoryDayPlans && (
              <p className="mt-2 font-body-sm text-body-sm text-error" role="alert">
                {fieldErrors.preparatoryDayPlans}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
        <label className="flex cursor-pointer items-start gap-3 text-on-surface">
          <input
            type="checkbox"
            checked={ipRestrictionEnabled}
            onChange={(event) => {
              setIpRestrictionEnabled(event.target.checked);
              if (!event.target.checked) clearFieldError("allowedIpRanges");
            }}
            className="mt-0.5 size-5 shrink-0 accent-primary"
          />
          <span>
            <span className="block font-label-md text-label-md">Okul ağı kontrolü</span>
            <span className="mt-0.5 block font-body-sm text-body-sm text-on-surface-variant">
              Açıkken yalnızca aşağıdaki IP aralıklarından yoklama alınabilir.
            </span>
          </span>
        </label>

        <div className={ipRestrictionEnabled ? "mt-4" : "mt-4 opacity-55"}>
          <Textarea
            name="allowedIpRanges"
            label="İzin verilen IP aralıkları"
            required={ipRestrictionEnabled}
            disabled={!ipRestrictionEnabled}
            rows={2}
            value={allowedIpRanges}
            error={fieldErrors.allowedIpRanges}
            onChange={(event) => { setAllowedIpRanges(event.target.value); clearFieldError("allowedIpRanges"); }}
            placeholder="194.27.153.130/32"
            hint={
              ipRestrictionEnabled
                ? "Her satıra bir IPv4 veya IPv6 CIDR aralığı. Tek IP için /32 kullanın."
                : "IP kontrolü kapalı; yoklama sırasında ağ kontrolü yapılmayacak."
            }
          />
        </div>
      </div>

      <Input
        name="mandatoryAlertLimit"
        label="Devamsızlık hakkı"
        required
        type="number"
        min="1"
        max="100"
        defaultValue={course?.mandatoryAlertLimit ?? ""}
        placeholder="Örn. 4"
        hint="Öğrencinin başarısız sayılmadan önce kullanabileceği devamsızlık sayısı."
        error={fieldErrors.mandatoryAlertLimit}
        onChange={() => clearFieldError("mandatoryAlertLimit")}
        className="sm:max-w-xs"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant pt-4">
        <p className="font-body-md text-body-md text-on-surface-variant">
          Planlanan toplam: <span className="font-semibold text-on-surface">{(attendanceMode === "PREPARATORY" ? preparatoryWeeklyTotal : weeklyCount) * totalWeeks} {attendanceMode === "PREPARATORY" ? "ders" : "oturum"}</span>
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
