"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import { Table, TableBody, TableHead, TableRow, Td, Th } from "@/components/ui/table";

type PreviewRow = {
  rowNumber: number;
  fullName: string;
  schoolNumber: string;
  isMandatory: boolean;
  rawMandatory?: string;
  action: "CREATE" | "UPDATE" | "ERROR";
  errors: string[];
};

type Preview = {
  rows: PreviewRow[];
  metadata?: {
    faculty?: string;
    program?: string;
    classLevel?: string;
    courseCode?: string;
    branchCode?: string;
    courseName?: string;
    instructor?: string;
  };
  summary: {
    total: number;
    valid: number;
    invalid: number;
    create: number;
    update: number;
    mandatoryCount?: number;
    optionalCount?: number;
  };
};

type ApiBody = {
  data?: Preview;
  error?: { message?: string };
};

export function EnrollmentImport({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<Preview>();
  const [message, setMessage] = useState<{ text: string; variant: "success" | "error" | "info" }>();
  const [pending, setPending] = useState(false);

  async function sendFile(endpoint: "preview" | "import") {
    if (!file) {
      setMessage({ text: "Önce bir .xls veya .xlsx dosyası seçin.", variant: "error" });
      return;
    }

    setPending(true);
    setMessage(undefined);
    const formData = new FormData();
    formData.set("file", file);

    try {
      const response = await fetch(`/api/courses/${courseId}/enrollments/${endpoint}`, {
        method: "POST",
        body: formData,
      });
      const body = (await response.json()) as ApiBody;
      if (!response.ok) {
        throw new Error(body.error?.message ?? "Excel dosyası işlenemedi.");
      }

      if (endpoint === "preview" && body.data) {
        setPreview(body.data);
        setMessage({ text: "Önizleme hazır. Hatalı satırları kontrol edin.", variant: "info" });
      } else {
        setMessage({ text: "Öğrenci listesi başarıyla kaydedildi.", variant: "success" });
        setPreview(undefined);
        setFile(undefined);
        router.refresh();
      }
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "Excel dosyası işlenemedi.",
        variant: "error",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-4">
      <p className="font-body-md text-body-md text-on-surface-variant">
        Üniversite yoklama raporları doğrudan kullanılabilir. Kolonlar: <span className="font-medium text-on-surface">Adı Soyadı (veya Ad + Soyad), Öğrenci No, Alış/Ö.Not (veya Zorunlu)</span>
      </p>

      <label className="block font-label-sm text-label-sm text-on-surface">
        Excel öğrenci listesi (.xls veya .xlsx)
        <input
          type="file"
          accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="mt-2 block w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-2 font-body-md text-body-md file:mr-3 file:rounded-lg file:border-0 file:bg-primary/5 file:px-3 file:py-2 file:font-label-sm file:text-label-sm file:text-on-surface"
          onChange={(event) => {
            setFile(event.target.files?.[0]);
            setPreview(undefined);
            setMessage(undefined);
          }}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={pending || !file} onClick={() => sendFile("preview")}>
          {pending ? "İşleniyor…" : "Dosyayı önizle"}
        </Button>
        {preview && (
          <Button
            type="button"
            disabled={pending || preview.summary.invalid > 0}
            onClick={() => sendFile("import")}
          >
            {preview.summary.invalid > 0 ? "Hataları düzeltin" : "Listeyi kaydet"}
          </Button>
        )}
      </div>

      {message && (
        <StatusMessage variant={message.variant === "error" ? "error" : message.variant === "success" ? "success" : "info"}>
          {message.text}
        </StatusMessage>
      )}

      {preview && (
        <div className="overflow-hidden rounded-xl border border-outline-variant">
          {preview.metadata && Object.keys(preview.metadata).length > 0 && (
            <div className="grid gap-3 border-b border-outline-variant bg-primary/[0.035] px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Rapordaki ders</p>
                <p className="mt-1 font-medium text-on-surface">{preview.metadata.courseName ?? "—"}</p>
              </div>
              <div>
                <p className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Kod / Şube</p>
                <p className="mt-1 font-medium text-on-surface">
                  {[preview.metadata.courseCode, preview.metadata.branchCode].filter(Boolean).join(" / ") || "—"}
                </p>
              </div>
              <div>
                <p className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Program / Sınıf</p>
                <p className="mt-1 font-medium text-on-surface">
                  {[preview.metadata.program, preview.metadata.classLevel && `${preview.metadata.classLevel}. sınıf`]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
              <div>
                <p className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Öğretim elemanı</p>
                <p className="mt-1 font-medium text-on-surface">{preview.metadata.instructor ?? "—"}</p>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-1 border-b border-outline-variant bg-surface-container-low px-6 py-3 font-body-md text-body-md">
            <span>Toplam: <strong className="text-on-surface">{preview.summary.total}</strong></span>
            <span>Geçerli: <strong className="text-secondary">{preview.summary.valid}</strong></span>
            <span>Hatalı: <strong className="text-error">{preview.summary.invalid}</strong></span>
            {preview.summary.mandatoryCount !== undefined && (
              <span>Zorunlu: <strong className="text-primary">{preview.summary.mandatoryCount}</strong></span>
            )}
            {preview.summary.optionalCount !== undefined && (
              <span>Alttan/Muaf: <strong className="text-on-surface-variant">{preview.summary.optionalCount}</strong></span>
            )}
            <span>Yeni: <strong className="text-on-surface">{preview.summary.create}</strong></span>
            <span>Güncelleme: <strong className="text-on-surface">{preview.summary.update}</strong></span>
          </div>
          <div className="max-h-80 overflow-auto">
            <Table>
              <TableHead>
                <Th>Satır</Th>
                <Th>Öğrenci</Th>
                <Th>Okul No</Th>
                <Th>Alış / Ö.Not</Th>
                <Th>Sonuç</Th>
              </TableHead>
              <TableBody>
                {preview.rows.slice(0, 50).map((row) => (
                  <TableRow key={row.rowNumber}>
                    <Td className="font-mono text-label-sm text-on-surface-variant">{row.rowNumber}</Td>
                    <Td className="font-medium text-on-surface">{row.fullName || "—"}</Td>
                    <Td>{row.schoolNumber || "—"}</Td>
                    <Td>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-on-surface">
                          {row.rawMandatory || (row.isMandatory ? "Zorunlu" : "Alttan")}
                        </span>
                        <span
                          className={`inline-flex w-fit items-center rounded px-1.5 py-0.5 text-xs ${
                            row.isMandatory
                              ? "bg-primary/10 text-primary font-medium"
                              : "bg-surface-container-high text-on-surface-variant"
                          }`}
                        >
                          {row.isMandatory ? "Devam zorunlu" : "Devam muaf"}
                        </span>
                      </div>
                    </Td>
                    <Td className={row.action === "ERROR" ? "text-error" : "text-secondary"}>
                      {row.errors.length > 0
                        ? row.errors.join(" ")
                        : row.action === "CREATE"
                          ? "Yeni kayıt"
                          : "Güncellenecek"}
                    </Td>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {preview.rows.length > 50 && (
            <p className="border-t border-outline-variant px-6 py-3 font-label-sm text-label-sm text-on-surface-variant">
              İlk 50 satır gösteriliyor; doğrulama tüm {preview.rows.length} satıra uygulandı.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
