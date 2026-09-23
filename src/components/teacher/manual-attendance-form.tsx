"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/icons";
import { StatusMessage } from "@/components/ui/status-message";
import { Table, TableBody, TableHead, TableRow, Td, Th } from "@/components/ui/table";
import { cn } from "@/lib/cn";

type AttendanceStatus = "PRESENT" | "ABSENT";

type Enrollment = {
  id: string;
  fullNameOnList: string;
  schoolNumberOnList: string;
  isMandatory: boolean;
  matchedUser?: {
    image: string | null;
  } | null;
};

const options: Array<{ value: AttendanceStatus; label: string; activeClass: string }> = [
  { value: "PRESENT", label: "Var", activeClass: "border-secondary bg-secondary text-on-secondary" },
  { value: "ABSENT", label: "Yok", activeClass: "border-error bg-error text-on-error" },
];

export function ManualAttendanceForm({
  courseId,
  enrollments,
  totalWeeks,
  weeklySessionCount,
  initialWeekNumber,
  initialSessionIndex,
}: {
  courseId: string;
  enrollments: Enrollment[];
  totalWeeks: number;
  weeklySessionCount: number;
  initialWeekNumber: number;
  initialSessionIndex: number;
}) {
  const router = useRouter();
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>(() =>
    Object.fromEntries(enrollments.map((enrollment) => [enrollment.id, "ABSENT"])),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState(false);
  const [weekNumber, setWeekNumber] = useState(initialWeekNumber);
  const [sessionIndexInWeek, setSessionIndexInWeek] = useState(
    Math.min(initialSessionIndex, weeklySessionCount),
  );

  const counts = useMemo(
    () =>
      Object.values(records).reduce(
        (result, status) => ({ ...result, [status]: result[status] + 1 }),
        { PRESENT: 0, ABSENT: 0 },
      ),
    [records],
  );

  function markAll(status: AttendanceStatus) {
    setRecords(Object.fromEntries(enrollments.map((enrollment) => [enrollment.id, status])));
  }

  async function save() {
    setPending(true);
    setError(undefined);
    setSuccess(false);
    try {
      const response = await fetch(`/api/courses/${courseId}/sessions/manual`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          weekNumber,
          sessionIndexInWeek,
          records: enrollments.map((enrollment) => ({
            enrollmentId: enrollment.id,
            status: records[enrollment.id],
          })),
        }),
      });
      const body = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(body.error?.message ?? "Manuel yoklama kaydedilemedi.");
      }

      router.refresh();
      setSuccess(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Manuel yoklama kaydedilemedi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="grid gap-4 border-b border-outline-variant bg-surface-container-lowest px-6 py-5 sm:grid-cols-2">
        <label className="font-label-sm text-label-sm text-on-surface">
          Hafta
          <select value={weekNumber} onChange={(event) => setWeekNumber(Number(event.target.value))} className="mt-1.5 min-h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 font-body-md text-body-md">
            {Array.from({ length: totalWeeks }, (_, index) => index + 1).map((week) => <option key={week} value={week}>Hafta {week}</option>)}
          </select>
        </label>
        <label className="font-label-sm text-label-sm text-on-surface">
          Ders oturumu
          <select value={sessionIndexInWeek} onChange={(event) => setSessionIndexInWeek(Number(event.target.value))} className="mt-1.5 min-h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 font-body-md text-body-md">
            {Array.from({ length: weeklySessionCount }, (_, index) => index + 1).map((sessionIndex) => <option key={sessionIndex} value={sessionIndex}>Oturum {sessionIndex}</option>)}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant bg-surface-container-low px-6 py-4">
        <p className="font-body-md text-body-md text-on-surface-variant">
          <strong className="text-secondary">{counts.PRESENT} var</strong>
          <span aria-hidden="true"> · </span>
          <strong className="text-error">{counts.ABSENT} yok</strong>
        </p>
        <div className="flex items-center gap-2 font-label-sm text-label-sm">
          <span className="text-on-surface-variant">Tümünü:</span>
          <button type="button" className="rounded-md px-2 py-1 font-semibold text-secondary hover:bg-secondary-container" onClick={() => markAll("PRESENT")}>Var</button>
          <button type="button" className="rounded-md px-2 py-1 font-semibold text-error hover:bg-error-container" onClick={() => markAll("ABSENT")}>Yok</button>
        </div>
      </div>

      {enrollments.length === 0 ? (
        <div className="border-b border-outline-variant px-6 py-12 text-center">
          <h2 className="font-h3 text-h3 text-on-surface">Öğrenci listesi boş</h2>
          <p className="mt-2 font-body-md text-body-md text-on-surface-variant">Ders ayarlarından Excel öğrenci listesini yükleyip tekrar gelin.</p>
        </div>
      ) : (
        <Table className="[&_table]:min-w-[560px]">
          <TableHead>
            <Th>Öğrenci</Th>
            <Th>Okul no</Th>
            <Th className="text-right">Durum</Th>
          </TableHead>
          <TableBody>
            {enrollments.map((enrollment) => (
              <TableRow key={enrollment.id}>
                <Td className="font-medium text-on-surface">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-outline-variant bg-surface-container">
                      {enrollment.matchedUser?.image ? (
                        <Image
                          src={enrollment.matchedUser.image}
                          alt=""
                          width={36}
                          height={36}
                          unoptimized
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <MaterialIcon name="person" className="text-lg text-on-surface-variant" />
                      )}
                    </div>
                    <div>
                      <span>{enrollment.fullNameOnList}</span>
                      {enrollment.isMandatory && (
                        <span className="ml-2 font-label-sm text-label-sm text-tertiary">
                          Zorunlu
                        </span>
                      )}
                    </div>
                  </div>
                </Td>
                <Td className="tabular-nums text-on-surface-variant">{enrollment.schoolNumberOnList}</Td>
                <Td className="text-right">
                  <div className="inline-flex" role="radiogroup" aria-label={`${enrollment.fullNameOnList} yoklama durumu`}>
                    {options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={records[enrollment.id] === option.value}
                        onClick={() => setRecords((current) => ({ ...current, [enrollment.id]: option.value }))}
                        className={cn(
                          "cursor-pointer border-y border-r border-outline-variant px-3 py-2 font-label-sm text-label-sm first:rounded-l-lg first:border-l last:rounded-r-lg",
                          records[enrollment.id] === option.value
                            ? option.activeClass
                            : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low",
                        )}
                      >{option.label}</button>
                    ))}
                  </div>
                </Td>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="sticky bottom-0 flex flex-col gap-3 border-t border-outline-variant bg-surface-container-lowest/95 px-6 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="font-body-md text-body-md text-on-surface-variant">Kaydettiğinizde bu oturum kapanır ve ders ilerlemesine eklenir.</p>
        <Button type="button" size="lg" disabled={pending || enrollments.length === 0} onClick={() => void save()}>
          {pending ? "Kaydediliyor…" : "Manuel Yoklamayı Kaydet"}
        </Button>
      </div>
      {success && <StatusMessage variant="success" className="mt-4">Manuel yoklama başarıyla kaydedildi.</StatusMessage>}
      {error && <StatusMessage variant="error" className="mt-4">{error}</StatusMessage>}
    </div>
  );
}
