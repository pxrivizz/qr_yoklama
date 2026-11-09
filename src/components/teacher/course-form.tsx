"use client";

import { useRouter } from "next/navigation";
import { FormEvent, type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { StatusMessage } from "@/components/ui/status-message";
import { CourseLocationNetwork } from "@/components/teacher/course-location-network";
import { WEEKDAYS, type PreparatoryDayPlan } from "@/lib/attendance/slot";
import {
  DEFAULT_CAMPUS_LOCATION,
  DEFAULT_CAMPUS_NETWORK_CIDR,
} from "@/lib/locations/campus-locations";

type VerificationMode = "REQUIRED" | "DISABLED";

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
  attendancePolicy: {
    photoMode: VerificationMode;
    networkMode: VerificationMode;
    locationMode: VerificationMode;
    deviceMode: VerificationMode;
    maxLocationAccuracyMeters: number | null;
    lateAfterMinutes: number | null;
  };
  _count?: { attendanceSessions: number };
};

type CourseFormProps = {
  course?: EditableCourse;
  initialValues?: { name?: string; code?: string };
  enrollmentFile?: File;
  importedStudentCount?: number;
  onSaved?: () => void;
  onCancel?: () => void;
  presentation?: "default" | "create";
  supplementaryContent?: ReactNode;
};

type ApiErrorBody = {
  data?: { id?: string };
  error?: { message?: string; fields?: Record<string, string[] | undefined> };
};

type FieldErrors = Record<string, string>;

function roundCoordinate(value: number) {
  return Number(value.toFixed(4));
}

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
    ["allowedRadiusMeters", "Yoklama alanı"],
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
    ["allowedRadiusMeters", 10, 2_000, "Yoklama alanı 10 ile 2000 metre arasında olmalıdır."],
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
  onCancel,
  presentation = "default",
  supplementaryContent,
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
  const [schoolLat, setSchoolLat] = useState(() =>
    roundCoordinate(course?.schoolLat ?? DEFAULT_CAMPUS_LOCATION.latitude),
  );
  const [schoolLng, setSchoolLng] = useState(() =>
    roundCoordinate(course?.schoolLng ?? DEFAULT_CAMPUS_LOCATION.longitude),
  );
  const [allowedRadiusMeters, setAllowedRadiusMeters] = useState(
    course?.allowedRadiusMeters ?? 100,
  );
  const [allowedIpRanges, setAllowedIpRanges] = useState(
    course?.allowedIpRanges.join("\n") || DEFAULT_CAMPUS_NETWORK_CIDR,
  );
  const [photoMode, setPhotoMode] = useState<VerificationMode>(course?.attendancePolicy.photoMode ?? "REQUIRED");
  const [networkMode, setNetworkMode] = useState<VerificationMode>(course?.attendancePolicy.networkMode ?? "REQUIRED");
  const ipRestrictionEnabled = networkMode === "REQUIRED";
  const [locationMode, setLocationMode] = useState<VerificationMode>(course?.attendancePolicy.locationMode ?? "REQUIRED");
  const [deviceMode, setDeviceMode] = useState<VerificationMode>(course?.attendancePolicy.deviceMode ?? "REQUIRED");
  const [maxLocationAccuracyMeters, setMaxLocationAccuracyMeters] = useState<number | "">(
    course?.attendancePolicy.maxLocationAccuracyMeters ?? "",
  );
  const [lateAfterMinutes, setLateAfterMinutes] = useState<number | "">(
    course?.attendancePolicy.lateAfterMinutes ?? "",
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ text: string; variant: "success" | "error" }>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const isEditing = Boolean(course);
  const importSignature = `${initialValues?.name ?? ""}\u0000${initialValues?.code ?? ""}`;
  const [previousImportSignature, setPreviousImportSignature] = useState(importSignature);

  if (!course && importSignature !== previousImportSignature) {
    setPreviousImportSignature(importSignature);
    setName(initialValues?.name ?? "");
    setCode(initialValues?.code ?? "");
  }

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
      allowedRadiusMeters,
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
      attendancePolicy: {
        photoMode,
        networkMode: ipRestrictionEnabled ? networkMode : "DISABLED",
        locationMode,
        deviceMode,
        maxLocationAccuracyMeters: maxLocationAccuracyMeters === "" ? null : Number(maxLocationAccuracyMeters),
        lateAfterMinutes: lateAfterMinutes === "" ? null : Number(lateAfterMinutes),
      },
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
        setSchoolLat(roundCoordinate(DEFAULT_CAMPUS_LOCATION.latitude));
        setSchoolLng(roundCoordinate(DEFAULT_CAMPUS_LOCATION.longitude));
        setAllowedRadiusMeters(100);
        setAllowedIpRanges(DEFAULT_CAMPUS_NETWORK_CIDR);
        setPhotoMode("REQUIRED");
        setNetworkMode("REQUIRED");
        setLocationMode("REQUIRED");
        setDeviceMode("REQUIRED");
        setMaxLocationAccuracyMeters("");
        setLateAfterMinutes("");
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

  const identityFields = (
    <div className={presentation === "create" ? "grid gap-4" : "grid gap-4 sm:grid-cols-3"}>
      <label className="block font-label-sm text-label-sm text-on-surface">
        Ders türü
        <select
          name="attendanceMode"
          value={attendanceMode}
          disabled={Boolean(course?._count?.attendanceSessions)}
          onChange={(event) => {
            setAttendanceMode(event.target.value as "STANDARD" | "PREPARATORY");
            clearFieldError("preparatoryDayPlans");
            clearFieldError("weeklySessionCount");
          }}
          className="mt-1.5 min-h-11 w-full rounded-lg border border-outline bg-surface-container-lowest px-3 font-body-md text-body-md text-on-surface outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="STANDARD">Fakülte dersi</option>
          <option value="PREPARATORY">Yabancı Diller M.Y.O. / Hazırlık</option>
        </select>
      </label>
      <Input name="name" label="Ders adı" required autoFocus={!course} value={name} error={fieldErrors.name} onChange={(event) => { setName(event.target.value); clearFieldError("name"); }} placeholder="Web Programlama" />
      <Input name="code" label="Ders kodu" required value={code} error={fieldErrors.code} onChange={(event) => { setCode(event.target.value); clearFieldError("code"); }} placeholder="WEB-101" />
    </div>
  );

  const historyNotice = course?._count?.attendanceSessions ? (
    <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
      Yoklama geçmişi bulunduğu için ders türü değiştirilemez.
    </p>
  ) : null;

  const locationPicker = (
    <CourseLocationNetwork
      latitude={schoolLat}
      longitude={schoolLng}
      radiusMeters={allowedRadiusMeters}
      compact={presentation === "create"}
      onLocationChange={(latitude, longitude) => {
        setSchoolLat(roundCoordinate(latitude));
        setSchoolLng(roundCoordinate(longitude));
        clearFieldError("schoolLat");
        clearFieldError("schoolLng");
      }}
      onIpAddressChange={(cidr) => {
        setAllowedIpRanges(cidr);
        setNetworkMode("REQUIRED");
        clearFieldError("allowedIpRanges");
      }}
    />
  );

  const coordinateFields = (
    <div className={presentation === "create" ? "grid gap-4 sm:grid-cols-3" : "grid gap-4 sm:grid-cols-2"}>
      <Input name="schoolLat" label="Okul enlemi" required type="number" step="0.0001" value={schoolLat} error={fieldErrors.schoolLat} onChange={(event) => { setSchoolLat(roundCoordinate(Number(event.target.value))); clearFieldError("schoolLat"); }} />
      <Input name="schoolLng" label="Okul boylamı" required type="number" step="0.0001" value={schoolLng} error={fieldErrors.schoolLng} onChange={(event) => { setSchoolLng(roundCoordinate(Number(event.target.value))); clearFieldError("schoolLng"); }} />
      {presentation === "create" && (
        <Input
          name="allowedRadiusMeters"
          label="Yoklama alanı (metre)"
          required
          type="number"
          min="10"
          max="2000"
          value={allowedRadiusMeters}
          error={fieldErrors.allowedRadiusMeters}
          onChange={(event) => {
            setAllowedRadiusMeters(Number(event.target.value));
            clearFieldError("allowedRadiusMeters");
          }}
        />
      )}
    </div>
  );

  const scheduleFields = (
    <div className={`grid gap-4 sm:grid-cols-2 ${presentation === "create" || attendanceMode === "PREPARATORY" ? "xl:grid-cols-3" : "lg:grid-cols-4"}`}>
      {presentation !== "create" && (
        <Input
          name="allowedRadiusMeters"
          label="Yoklama alanı (metre)"
          required
          type="number"
          min="10"
          max="2000"
          value={allowedRadiusMeters}
          error={fieldErrors.allowedRadiusMeters}
          hint="Seçilen noktanın çevresinde yoklama alınabilecek uzaklık. Haritada mavi alan olarak gösterilir."
          onChange={(event) => {
            setAllowedRadiusMeters(Number(event.target.value));
            clearFieldError("allowedRadiusMeters");
          }}
        />
      )}
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
      />
    </div>
  );

  const preparatorySchedule = attendanceMode === "PREPARATORY" ? (
    <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
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
                  className="min-h-10 w-20 rounded-lg border border-outline bg-surface-container-lowest px-3 text-center font-body-md text-body-md tabular-nums outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
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
  ) : null;

  const networkFields = (
    <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-label-md text-label-md text-on-surface">
            Okul interneti <span className="text-on-surface-variant">(eduroam ağı)</span>
          </h3>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            İnternet kontrolü açıksa öğrenciler yoklama verebilmek için eduroam ağına bağlı olmalıdır.
          </p>
        </div>
        <label className="shrink-0 font-label-sm text-label-sm text-on-surface sm:w-40">
          İnternet kontrolü
          <select
            value={networkMode}
            onChange={(event) => setNetworkMode(event.target.value as VerificationMode)}
            className="mt-1.5 min-h-11 w-full rounded-lg border border-outline bg-surface-container-lowest px-3 font-body-md text-body-md text-on-surface outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
          >
            <option value="REQUIRED">Açık</option>
            <option value="DISABLED">Kapalı</option>
          </select>
        </label>
      </div>
      <div className={ipRestrictionEnabled ? "mt-4" : "mt-4 opacity-55"}>
        <Textarea
          name="allowedIpRanges"
          label="eduroam internet adresleri"
          required={ipRestrictionEnabled}
          disabled={!ipRestrictionEnabled}
          rows={2}
          value={allowedIpRanges}
          error={fieldErrors.allowedIpRanges}
          onChange={(event) => { setAllowedIpRanges(event.target.value); clearFieldError("allowedIpRanges"); }}
          placeholder="194.27.153.159/8"
          hint={
            ipRestrictionEnabled
              ? "Her satıra bir adres yazın. Tek bir IPv4 adresi için sonuna /32 ekleyin."
              : "İnternet kontrolü kapalı."
          }
        />
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} noValidate className={presentation === "create" ? "grid" : "grid gap-4"}>
      {presentation === "create" ? (
        <div className="grid lg:grid-cols-2">
          <section id="new-course-details" className="min-w-0 scroll-mt-32 p-4 sm:p-5 lg:border-r lg:border-outline-variant lg:p-6">
            <h3 className="font-h3 text-h3 text-on-surface">Ders bilgileri</h3>
            <div className="mt-4">{identityFields}</div>
            {historyNotice}
            <div className="mt-6 border-t border-outline-variant pt-5">
              <h3 className="font-h3 text-h3 text-on-surface">Dönem ve devam kuralları</h3>
              <div className="mt-4">{scheduleFields}</div>
            </div>
            {preparatorySchedule && <div className="mt-5">{preparatorySchedule}</div>}
          </section>

          <section id="new-course-location" className="min-w-0 scroll-mt-32 border-t border-outline-variant p-4 sm:p-5 lg:border-t-0 lg:p-6">
            {locationPicker}
            <div className="mt-5">{coordinateFields}</div>
            <div className="mt-5">{networkFields}</div>
          </section>
        </div>
      ) : (
        <>
          {identityFields}
          {historyNotice}
          {locationPicker}
          {coordinateFields}
          {scheduleFields}
          {preparatorySchedule}
          {networkFields}
        </>
      )}

      {/* Yoklama doğrulama koşulları geçici olarak arayüzden kaldırıldı.
          İlgili state ve API alanları yeniden etkinleştirme için korunuyor. */}

      {supplementaryContent && (
        <section id="new-course-students" className="scroll-mt-32 border-t border-outline-variant p-4 sm:p-5 lg:p-6">
          {supplementaryContent}
        </section>
      )}

      {message && (
        <div className={presentation === "create" ? "px-4 pb-4 sm:px-5 lg:px-6" : undefined}>
          <StatusMessage variant={message.variant === "success" ? "success" : "error"}>
            {message.text}
          </StatusMessage>
        </div>
      )}

      <div className={presentation === "create"
        ? "sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t border-outline-variant bg-surface-container-lowest/95 px-4 py-3 backdrop-blur sm:px-5 lg:px-6"
        : "flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant pt-4"}
      >
        {presentation === "create" && onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Vazgeç
          </Button>
        )}
        <p className={presentation === "create"
          ? "min-w-0 flex-1 text-center font-body-sm text-body-sm text-on-surface-variant"
          : "font-body-md text-body-md text-on-surface-variant"}
        >
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
    </form>
  );
}
