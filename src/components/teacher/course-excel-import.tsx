"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/icons";
import { StatusMessage } from "@/components/ui/status-message";

type CourseMetadata = {
  faculty?: string;
  program?: string;
  classLevel?: string;
  courseCode?: string;
  branchCode?: string;
  courseName?: string;
  instructor?: string;
};

type PreviewRow = {
  rowNumber: number;
  fullName: string;
  schoolNumber: string;
  isMandatory?: boolean;
  rawMandatory?: string;
  errors: string[];
};

type CourseImportPreview = {
  metadata?: CourseMetadata;
  rows: PreviewRow[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    mandatoryCount?: number;
    optionalCount?: number;
  };
};

export type PreparedCourseImport = CourseImportPreview & { file: File };

type ApiBody = {
  data?: CourseImportPreview;
  error?: { message?: string };
};

export function CourseExcelImport({
  onPrepared,
}: {
  onPrepared: (value: PreparedCourseImport | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<CourseImportPreview>();
  const [showStudentList, setShowStudentList] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  function selectFile(nextFile?: File) {
    setFile(nextFile);
    setPreview(undefined);
    setShowStudentList(false);
    setError(undefined);
    onPrepared(undefined);
  }

  async function inspectFile() {
    if (!file) return;
    setPending(true);
    setError(undefined);
    const formData = new FormData();
    formData.set("file", file);

    try {
      const response = await fetch("/api/courses/import-preview", {
        method: "POST",
        body: formData,
      });
      const body = (await response.json()) as ApiBody;
      if (!response.ok || !body.data) {
        throw new Error(body.error?.message ?? "Excel dosyası incelenemedi.");
      }
      setPreview(body.data);
      if (body.data.summary.invalid === 0) {
        onPrepared({ ...body.data, file });
      } else {
        onPrepared(undefined);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Excel dosyası incelenemedi.");
      setPreview(undefined);
      onPrepared(undefined);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-low p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-h3 text-h3 text-on-surface">Öğrencileri içeri aktar</p>
          <p className="mt-1 max-w-xl font-body-md text-body-md text-on-surface-variant">
            Üniversite yoklama listesini yükleyin. Ders adı ve kodu bulunursa aşağıdaki forma otomatik aktarılır; tüm alanları değiştirebilirsiniz.
          </p>
          <p className="mt-1.5 font-label-sm text-label-sm text-on-surface-variant">
            Desteklenen kolonlar: <span className="font-medium text-on-surface">Adı Soyadı (veya Ad + Soyad), Öğrenci No, Alış/Ö.Not (veya Zorunlu)</span>
          </p>
        </div>
        <Button type="button" variant="secondary" className="shrink-0 gap-2" onClick={() => inputRef.current?.click()}>
          <MaterialIcon name="upload_file" /> Excel seç
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        aria-label="Excel öğrenci listesi seç"
        accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(event) => selectFile(event.target.files?.[0])}
      />

      {file && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-on-surface">{file.name}</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              {(file.size / 1024).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} KB
            </p>
          </div>
          <Button type="button" disabled={pending} onClick={inspectFile}>
            {pending ? "İnceleniyor…" : "Dosyayı incele"}
          </Button>
        </div>
      )}

      {error && <div className="mt-4"><StatusMessage variant="error">{error}</StatusMessage></div>}

      {preview && (
        <div className="mt-4 grid gap-3">
          <StatusMessage variant={preview.summary.invalid > 0 ? "error" : "success"}>
            {preview.summary.invalid > 0
              ? `${preview.summary.invalid} hatalı satır var. Dosyayı düzeltip yeniden seçin.`
              : `${preview.summary.valid} öğrenci hazır. Ders bilgileri forma aktarıldı.`}
          </StatusMessage>
          <div className="grid gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Ders</p>
              <p className="mt-1 font-medium text-on-surface">{preview.metadata?.courseName ?? "Excel’de bulunamadı"}</p>
            </div>
            <div>
              <p className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Kod / Şube</p>
              <p className="mt-1 font-medium text-on-surface">
                {[preview.metadata?.courseCode, preview.metadata?.branchCode].filter(Boolean).join(" / ") || "Excel’de bulunamadı"}
              </p>
            </div>
            <div>
              <p className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Öğrenci</p>
              <p className="mt-1 font-medium text-on-surface">{preview.summary.valid} / {preview.summary.total} geçerli</p>
            </div>
            <div>
              <p className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Alış / Devam Durumu</p>
              <p className="mt-1 font-medium text-on-surface">
                {preview.summary.mandatoryCount ?? 0} Zorunlu · {preview.summary.optionalCount ?? 0} Alttan/Muaf
              </p>
            </div>
          </div>

          {preview.rows.length > 0 && (
            <div>
              <Button
                type="button"
                variant="ghost"
                className="h-auto p-0 font-label-sm text-label-sm text-primary hover:underline"
                onClick={() => setShowStudentList(!showStudentList)}
              >
                <MaterialIcon name={showStudentList ? "expand_less" : "expand_more"} className="text-base" />
                {showStudentList ? "Öğrenci listesini gizle" : `Öğrenci listesini göster (${preview.rows.length})`}
              </Button>
              {showStudentList && (
                <div className="mt-2 max-h-60 overflow-auto rounded-lg border border-outline-variant bg-surface-container-lowest">
                  <table className="w-full border-collapse text-left font-body-md text-sm">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant">
                        <th className="p-2.5">Satır</th>
                        <th className="p-2.5">Öğrenci No</th>
                        <th className="p-2.5">Adı Soyadı</th>
                        <th className="p-2.5">Alış / Ö.Not</th>
                        <th className="p-2.5">Devam Durumu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0, 50).map((row) => (
                        <tr key={row.rowNumber} className="border-b border-outline-variant/60 last:border-0 hover:bg-surface-container-low/50">
                          <td className="p-2.5 font-mono text-label-sm text-on-surface-variant">{row.rowNumber}</td>
                          <td className="p-2.5 font-mono text-on-surface">{row.schoolNumber || "—"}</td>
                          <td className="p-2.5 font-medium text-on-surface">{row.fullName || "—"}</td>
                          <td className="p-2.5 text-on-surface-variant">{row.rawMandatory || (row.isMandatory ? "Zorunlu" : "Alttan")}</td>
                          <td className="p-2.5">
                            <span
                              className={`inline-flex items-center rounded px-2 py-0.5 font-label-sm text-label-sm ${
                                row.isMandatory
                                  ? "bg-primary/10 text-primary"
                                  : "bg-surface-container-high text-on-surface-variant"
                              }`}
                            >
                              {row.isMandatory ? "Zorunlu" : "Devam Muaf"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.rows.length > 50 && (
                    <p className="p-2 text-center font-label-sm text-label-sm text-on-surface-variant">
                      İlk 50 öğrenci listeleniyor; toplam {preview.rows.length} öğrenci aktarılacak.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {preview.summary.invalid > 0 && (
            <ul className="grid gap-1 font-label-sm text-label-sm text-error">
              {preview.rows.filter((row) => row.errors.length > 0).slice(0, 5).map((row) => (
                <li key={row.rowNumber}>Satır {row.rowNumber}: {row.errors.join(" ")}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
