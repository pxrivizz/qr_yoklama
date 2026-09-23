"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { EnrollmentImport } from "@/components/teacher/enrollment-import";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MaterialIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { StatusMessage } from "@/components/ui/status-message";
import { Table, TableBody, TableHead, TableRow, Td, Th } from "@/components/ui/table";
import type { CourseStudentItem, CourseStudentsData } from "@/lib/enrollments/service";

type CourseStudentsViewProps = {
  initialData: CourseStudentsData;
};

export function CourseStudentsView({ initialData }: CourseStudentsViewProps) {
  const router = useRouter();
  const { course, students, summary } = initialData;

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMandatory, setFilterMandatory] = useState<"ALL" | "MANDATORY" | "OPTIONAL">("ALL");
  const [filterMatched, setFilterMatched] = useState<"ALL" | "MATCHED" | "UNMATCHED">("ALL");
  const [filterRiskOnly, setFilterRiskOnly] = useState(false);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<CourseStudentItem | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<CourseStudentItem | null>(null);

  // Form States
  const [addFullName, setAddFullName] = useState("");
  const [addSchoolNumber, setAddSchoolNumber] = useState("");
  const [addIsMandatory, setAddIsMandatory] = useState(true);

  const [editFullName, setEditFullName] = useState("");
  const [editSchoolNumber, setEditSchoolNumber] = useState("");
  const [editIsMandatory, setEditIsMandatory] = useState(true);

  // Feedback & Action state
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ text: string; variant: "success" | "error" | "info" } | null>(null);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLocaleLowerCase("tr-TR").trim();
        const matchesName = student.fullName.toLocaleLowerCase("tr-TR").includes(q);
        const matchesNumber = student.schoolNumber.toLowerCase().includes(q);
        const matchesEmail = student.matchedUser?.email?.toLowerCase().includes(q) ?? false;
        if (!matchesName && !matchesNumber && !matchesEmail) {
          return false;
        }
      }

      // Mandatory filter
      if (filterMandatory === "MANDATORY" && !student.isMandatory) return false;
      if (filterMandatory === "OPTIONAL" && student.isMandatory) return false;

      // Matched filter
      if (filterMatched === "MATCHED" && !student.matchedUserId) return false;
      if (filterMatched === "UNMATCHED" && student.matchedUserId) return false;

      // Risk filter
      if (
        filterRiskOnly &&
        !(student.stats.isFailed || student.stats.isAtLimit || student.stats.isNearLimit)
      ) {
        return false;
      }

      return true;
    });
  }, [students, searchQuery, filterMandatory, filterMatched, filterRiskOnly]);

  // Actions
  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!addFullName.trim() || !addSchoolNumber.trim()) {
      setMessage({ text: "Lütfen ad soyad ve okul numarasını doldurun.", variant: "error" });
      return;
    }

    setPending(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/courses/${course.id}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: addFullName.trim(),
          schoolNumber: addSchoolNumber.trim(),
          isMandatory: addIsMandatory,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error?.message ?? "Öğrenci eklenirken bir hata oluştu.");
      }

      setMessage({ text: "Öğrenci başarıyla derse eklendi.", variant: "success" });
      setIsAddModalOpen(false);
      setAddFullName("");
      setAddSchoolNumber("");
      setAddIsMandatory(true);
      router.refresh();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Öğrenci eklenemedi.",
        variant: "error",
      });
    } finally {
      setPending(false);
    }
  }

  function openEditModal(student: CourseStudentItem) {
    setStudentToEdit(student);
    setEditFullName(student.fullName);
    setEditSchoolNumber(student.schoolNumber);
    setEditIsMandatory(student.isMandatory);
    setMessage(null);
  }

  async function handleUpdateStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!studentToEdit) return;

    if (!editFullName.trim() || !editSchoolNumber.trim()) {
      setMessage({ text: "Lütfen ad soyad ve okul numarasını doldurun.", variant: "error" });
      return;
    }

    setPending(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/courses/${course.id}/enrollments/${studentToEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editFullName.trim(),
          schoolNumber: editSchoolNumber.trim(),
          isMandatory: editIsMandatory,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error?.message ?? "Öğrenci güncellenirken bir hata oluştu.");
      }

      setMessage({ text: "Öğrenci bilgileri güncellendi.", variant: "success" });
      setStudentToEdit(null);
      router.refresh();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Öğrenci güncellenemedi.",
        variant: "error",
      });
    } finally {
      setPending(false);
    }
  }

  async function handleToggleMandatory(student: CourseStudentItem) {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/courses/${course.id}/enrollments/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isMandatory: !student.isMandatory,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error?.message ?? "Zorunluluk durumu değiştirilemedi.");
      }

      setMessage({
        text: `${student.fullName} için devam statüsü güncellendi.`,
        variant: "info",
      });
      router.refresh();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "İşlem tamamlanamadı.",
        variant: "error",
      });
    } finally {
      setPending(false);
    }
  }

  async function handleDeleteStudent() {
    if (!studentToDelete) return;

    setPending(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/courses/${course.id}/enrollments/${studentToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message ?? "Öğrenci silinemedi.");
      }

      setMessage({
        text: `${studentToDelete.fullName} dersten çıkarıldı.`,
        variant: "success",
      });
      setStudentToDelete(null);
      router.refresh();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Öğrenci silinemedi.",
        variant: "error",
      });
    } finally {
      setPending(false);
    }
  }

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    filterMandatory !== "ALL" ||
    filterMatched !== "ALL" ||
    filterRiskOnly;

  function resetFilters() {
    setSearchQuery("");
    setFilterMandatory("ALL");
    setFilterMatched("ALL");
    setFilterRiskOnly(false);
  }

  return (
    <div className="animate-fade-in-up mx-auto max-w-container-max-width px-6 py-stack-lg sm:px-margin-page">
      {/* Back link & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/ogretmen/ders/${course.id}`}
          className="inline-flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant transition-colors duration-200 hover:text-on-surface"
        >
          <MaterialIcon name="arrow_back" /> Ders ayarlarına dön
        </Link>
        <Link
          href="/ogretmen/dersler"
          className="inline-flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant transition-colors duration-200 hover:text-on-surface"
        >
          <MaterialIcon name="school" /> Tüm derslerim
        </Link>
      </div>

      <div className="mt-4 flex flex-col gap-5 border-b border-outline-variant/60 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
              {course.code}
            </span>
            <span className="text-outline-variant">/</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {course.name}
            </span>
          </div>
          <h1 className="mt-1 font-h1 text-h1 text-on-surface">Öğrenci Listesi</h1>
          <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
            Kayıtlı öğrenciler, devam zorunluluk durumları ve sistem eşleşmeleri
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="primary"
            className="gap-2"
            onClick={() => {
              setMessage(null);
              setIsAddModalOpen(true);
            }}
          >
            <MaterialIcon name="person_add" />
            Yeni Öğrenci
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="gap-2"
            onClick={() => {
              setMessage(null);
              setIsImportModalOpen(true);
            }}
          >
            <MaterialIcon name="upload_file" />
            Excel Yükle
          </Button>

          <ButtonLink
            href={`/api/courses/${course.id}/enrollments/export`}
            variant="secondary"
            className="gap-2"
            download
          >
            <MaterialIcon name="download" />
            Excel İndir
          </ButtonLink>

          <ButtonLink
            href={`/ogretmen/ders/${course.id}/rapor`}
            variant="secondary"
            className="gap-2"
          >
            <MaterialIcon name="insights" />
            Yoklama Raporu
          </ButtonLink>
        </div>
      </div>

      {/* Global Status Message */}
      {message && (
        <div className="mt-5">
          <StatusMessage variant={message.variant}>{message.text}</StatusMessage>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Card className="p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Toplam Kayıtlı</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant">
              <MaterialIcon name="groups" className="text-xl" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-on-surface">
            {summary.totalStudents}
          </p>
          <p className="mt-0.5 text-xs text-on-surface-variant">öğrenci kayıtlı</p>
        </Card>

        <Card className="p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-primary font-medium">Devam Zorunlu</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MaterialIcon name="assignment_late" className="text-xl" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-on-surface">
            {summary.mandatoryCount}
          </p>
          <p className="mt-0.5 text-xs text-on-surface-variant">zorunlu devam</p>
        </Card>

        <Card className="p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Devam Muaf (Alttan)</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant">
              <MaterialIcon name="task_alt" className="text-xl" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-on-surface">
            {summary.optionalCount}
          </p>
          <p className="mt-0.5 text-xs text-on-surface-variant">muafiyetli</p>
        </Card>

        <Card className="p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-secondary font-medium">Sistemle Eşleşen</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
              <MaterialIcon name="verified_user" className="text-xl" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-on-surface">
            {summary.matchedCount}
          </p>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            {summary.unmatchedCount > 0 ? `${summary.unmatchedCount} bekleniyor` : "Tümü eşleşti"}
          </p>
        </Card>

        <Card className="p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-error font-medium">Devamsızlık Riski</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-container text-on-error-container">
              <MaterialIcon name="warning" className="text-xl" />
            </div>
          </div>
          <p className={`mt-2 text-2xl font-bold tracking-tight ${summary.alertCount > 0 ? "text-error" : "text-on-surface"}`}>
            {summary.alertCount}
          </p>
          <p className="mt-0.5 text-xs text-on-surface-variant">sınırda veya kalan</p>
        </Card>
      </div>

      {/* Filter & Search Toolbar */}
      <Card className="mt-6 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Bar */}
          <div className="relative min-w-0 flex-1 max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-on-surface-variant">
              <MaterialIcon name="search" className="text-xl" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Öğrenci adı veya numarası ile ara..."
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-10 pr-9 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-on-surface-variant hover:text-on-surface"
              >
                <MaterialIcon name="close" className="text-base" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Statü Filtresi */}
            <div className="inline-flex rounded-lg border border-outline-variant bg-surface-container-lowest p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setFilterMandatory("ALL")}
                className={`rounded-md px-2.5 py-1.5 font-medium transition-colors ${
                  filterMandatory === "ALL"
                    ? "bg-neutral-900 text-white"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Tümü
              </button>
              <button
                type="button"
                onClick={() => setFilterMandatory("MANDATORY")}
                className={`rounded-md px-2.5 py-1.5 font-medium transition-colors ${
                  filterMandatory === "MANDATORY"
                    ? "bg-primary text-white"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Zorunlu ({summary.mandatoryCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterMandatory("OPTIONAL")}
                className={`rounded-md px-2.5 py-1.5 font-medium transition-colors ${
                  filterMandatory === "OPTIONAL"
                    ? "bg-neutral-700 text-white"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Muaf ({summary.optionalCount})
              </button>
            </div>

            {/* Eşleşme Filtresi */}
            <div className="inline-flex rounded-lg border border-outline-variant bg-surface-container-lowest p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setFilterMatched("ALL")}
                className={`rounded-md px-2.5 py-1.5 font-medium transition-colors ${
                  filterMatched === "ALL"
                    ? "bg-neutral-900 text-white"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Hesap: Hepsi
              </button>
              <button
                type="button"
                onClick={() => setFilterMatched("MATCHED")}
                className={`rounded-md px-2.5 py-1.5 font-medium transition-colors ${
                  filterMatched === "MATCHED"
                    ? "bg-secondary text-white"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Eşleşti ({summary.matchedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterMatched("UNMATCHED")}
                className={`rounded-md px-2.5 py-1.5 font-medium transition-colors ${
                  filterMatched === "UNMATCHED"
                    ? "bg-amber-600 text-white"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Bekleniyor ({summary.unmatchedCount})
              </button>
            </div>

            {/* Risk Toggle */}
            {course.mandatoryAlertLimit !== null && (
              <button
                type="button"
                onClick={() => setFilterRiskOnly(!filterRiskOnly)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterRiskOnly
                    ? "border-red-300 bg-red-50 text-red-700 font-semibold"
                    : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <MaterialIcon name="warning" className="text-sm" />
                Riskli ({summary.alertCount})
              </button>
            )}

            {/* Reset Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              >
                <MaterialIcon name="filter_alt_off" className="text-sm" />
                Temizle
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Main Student List Table */}
      {students.length === 0 ? (
        <Card className="mt-6">
          <EmptyState
            title="Dersin henüz kayıtlı öğrencisi yok"
            description="Yoklama alabilmek ve devamsızlıkları takip edebilmek için Excel listesini yükleyin veya tekil öğrenci ekleyin."
            action={{
              label: "Excel ile İçe Aktar",
              onClick: () => setIsImportModalOpen(true),
            }}
          />
        </Card>
      ) : filteredStudents.length === 0 ? (
        <Card className="mt-6 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
            <MaterialIcon name="search_off" className="text-2xl" />
          </div>
          <h3 className="mt-3 font-h3 text-h3 text-on-surface">Eşleşen öğrenci bulunamadı</h3>
          <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
            Arama kriterlerinize veya seçtiğiniz filtrelere uygun öğrenci kaydı yok.
          </p>
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={resetFilters}>
              Filtreleri Temizle
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-outline-variant px-5 py-3.5 sm:px-6">
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                {filteredStudents.length} öğrenci listeleniyor
              </span>
              {hasActiveFilters && (
                <span className="text-xs text-on-surface-variant">
                  (toplam {students.length} kayıttan filtrelendi)
                </span>
              )}
            </div>
            {course.mandatoryAlertLimit !== null && (
              <Badge variant="warning">
                Devamsızlık Eşiği: {course.mandatoryAlertLimit} Oturum
              </Badge>
            )}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <Th className="min-w-60">Öğrenci</Th>
                <Th className="min-w-28">Okul No</Th>
                <Th className="min-w-36 text-center">Devam Zorunluluğu</Th>
                <Th className="min-w-32 text-center">Sistem Hesabı</Th>
                <Th className="min-w-36 text-center">Yoklama Durumu</Th>
                <Th className="min-w-24 text-right">İşlemler</Th>
              </TableHead>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow
                    key={student.id}
                    className={
                      student.stats.isFailed
                        ? "bg-error-container/20"
                        : student.stats.isAtLimit || student.stats.isNearLimit
                          ? "bg-amber-500/10"
                          : undefined
                    }
                  >
                    {/* Öğrenci Bilgisi */}
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-outline-variant bg-surface-container text-on-surface-variant font-medium">
                          {student.matchedUser?.image ? (
                            <Image
                              src={student.matchedUser.image}
                              alt={student.fullName}
                              width={40}
                              height={40}
                              unoptimized
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-semibold uppercase">
                              {student.fullName.slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-on-surface">{student.fullName}</p>
                          {student.matchedUser?.email ? (
                            <p className="text-xs text-on-surface-variant truncate max-w-xs">
                              {student.matchedUser.email}
                            </p>
                          ) : (
                            <p className="text-xs text-on-surface-variant/60">
                              Hesap eşleşmedi
                            </p>
                          )}
                        </div>
                      </div>
                    </Td>

                    {/* Okul No */}
                    <Td>
                      <span className="font-mono text-sm font-semibold text-on-surface">
                        {student.schoolNumber}
                      </span>
                    </Td>

                    {/* Devam Zorunluluğu (Tıklanabilir Toggle) */}
                    <Td className="text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleMandatory(student)}
                        title="Zorunluluk durumunu değiştirmek için tıklayın"
                        disabled={pending}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${
                          student.isMandatory
                            ? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                            : "bg-surface-container-high text-on-surface-variant border border-outline-variant/60 hover:bg-surface-container"
                        }`}
                      >
                        <MaterialIcon
                          name={student.isMandatory ? "assignment_late" : "task_alt"}
                          className="text-sm"
                        />
                        {student.isMandatory ? "Devam Zorunlu" : "Devam Muaf"}
                      </button>
                    </Td>

                    {/* Sistem Hesabı Eşleşme */}
                    <Td className="text-center">
                      {student.matchedUserId ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                          <MaterialIcon name="verified" className="text-xs text-emerald-600" />
                          Eşleşti
                        </span>
                      ) : (
                        <span
                          title="Öğrenci bu okul numarasıyla sisteme giriş yaptığında otomatik eşleşecektir."
                          className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 border border-neutral-200"
                        >
                          <MaterialIcon name="hourglass_empty" className="text-xs text-neutral-500" />
                          Bekleniyor
                        </span>
                      )}
                    </Td>

                    {/* Yoklama Durumu */}
                    <Td className="text-center">
                      {course.totalClosedSessions === 0 ? (
                        <span className="text-xs text-on-surface-variant">Henüz yoklama yok</span>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-2 font-mono text-xs">
                            <span className="text-secondary font-semibold" title="Katıldığı Oturum">
                              {student.stats.attendedCount} Var
                            </span>
                            <span className="text-outline-variant">·</span>
                            <span
                              className={`font-semibold ${student.stats.absentCount > 0 ? "text-error" : "text-on-surface-variant"}`}
                              title="Devamsızlık Sayısı"
                            >
                              {student.stats.absentCount} Yok
                            </span>
                            <span className="text-outline-variant">·</span>
                            <span className="font-bold text-on-surface">
                              %{student.stats.attendanceRate}
                            </span>
                          </div>

                          {student.stats.isFailed && (
                            <Badge variant="critical" className="gap-1">
                              <MaterialIcon name="error" className="text-xs" /> Kaldı
                            </Badge>
                          )}
                          {student.stats.isNearLimit && (
                            <Badge variant="warning" className="gap-1">
                              <MaterialIcon name="warning" className="text-xs" /> Sınıra Yakın
                            </Badge>
                          )}
                          {student.stats.isAtLimit && (
                            <Badge variant="warning" className="gap-1">
                              <MaterialIcon name="warning" className="text-xs" /> Sınırda
                            </Badge>
                          )}
                        </div>
                      )}
                    </Td>

                    {/* İşlemler (Düzenle / Sil) */}
                    <Td className="text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(student)}
                          title="Öğrenciyi düzenle"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                        >
                          <MaterialIcon name="edit" className="text-lg" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStudentToDelete(student);
                            setMessage(null);
                          }}
                          title="Öğrenciyi dersten çıkar"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <MaterialIcon name="delete" className="text-lg" />
                        </button>
                      </div>
                    </Td>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* MODAL 1: Tekil Öğrenci Ekle */}
      <Modal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Yeni Öğrenci Ekle"
        description={`${course.code} - ${course.name} dersine tekil öğrenci kaydı oluşturun.`}
      >
        <form onSubmit={handleAddStudent} className="grid gap-4">
          <Input
            label="Öğrenci Adı Soyadı"
            placeholder="Örn: Ahmet Yılmaz"
            value={addFullName}
            onChange={(e) => setAddFullName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Öğrenci Numarası"
            placeholder="Örn: 20230101"
            value={addSchoolNumber}
            onChange={(e) => setAddSchoolNumber(e.target.value)}
            required
          />

          <label className="mt-1 flex items-start gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-3.5 cursor-pointer">
            <input
              type="checkbox"
              checked={addIsMandatory}
              onChange={(e) => setAddIsMandatory(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
            />
            <div>
              <span className="font-label-sm text-label-sm font-medium text-on-surface">
                Bu öğrencinin derse devam zorunluluğu var
              </span>
              <p className="text-xs text-on-surface-variant">
                İşaretlenmezse öğrenci &quot;Alttan / Devam Muaf&quot; statüsünde kaydedilir.
              </p>
            </div>
          </label>

          <div className="mt-3 flex justify-end gap-2 border-t border-outline-variant pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
              disabled={pending}
            >
              İptal
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Ekleniyor…" : "Öğrenciyi Ekle"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Öğrenci Düzenle */}
      <Modal
        open={Boolean(studentToEdit)}
        onClose={() => setStudentToEdit(null)}
        title="Öğrenciyi Düzenle"
        description="Öğrencinin adını, numarasını veya devam zorunluluğunu güncelleyin."
      >
        {studentToEdit && (
          <form onSubmit={handleUpdateStudent} className="grid gap-4">
            <Input
              label="Öğrenci Adı Soyadı"
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
              required
            />

            <Input
              label="Öğrenci Numarası"
              value={editSchoolNumber}
              onChange={(e) => setEditSchoolNumber(e.target.value)}
              required
            />

            <label className="mt-1 flex items-start gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-3.5 cursor-pointer">
              <input
                type="checkbox"
                checked={editIsMandatory}
                onChange={(e) => setEditIsMandatory(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
              />
              <div>
                <span className="font-label-sm text-label-sm font-medium text-on-surface">
                  Devam zorunluluğu var
                </span>
                <p className="text-xs text-on-surface-variant">
                  İşareti kaldırırsanız öğrenci devamdan muaf tutulur.
                </p>
              </div>
            </label>

            <div className="mt-3 flex justify-end gap-2 border-t border-outline-variant pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStudentToEdit(null)}
                disabled={pending}
              >
                İptal
              </Button>
              <Button type="submit" variant="primary" disabled={pending}>
                {pending ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 3: Öğrenciyi Silme Onayı */}
      <Modal
        open={Boolean(studentToDelete)}
        onClose={() => setStudentToDelete(null)}
        title="Öğrenciyi Dersten Çıkar"
        description="Bu işlem geri alınamaz."
      >
        {studentToDelete && (
          <div className="grid gap-4">
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-900 border border-red-200">
              <p className="font-medium">
                {studentToDelete.fullName} ({studentToDelete.schoolNumber}) dersten çıkarılacak.
              </p>
              <p className="mt-1 text-red-700">
                Bu işlem öğrencinin bu derse ait geçmiş yoklama kayıtlarını ve tarama loglarını da temizler.
                Öğrencinin sisteme kayıtlı kullanıcı hesabı silinmez.
              </p>
            </div>

            <div className="mt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStudentToDelete(null)}
                disabled={pending}
              >
                Vazgeç
              </Button>
              <Button
                type="button"
                variant="critical"
                onClick={handleDeleteStudent}
                disabled={pending}
              >
                {pending ? "Siliniyor…" : "Evet, Dersten Çıkar"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 4: Excel ile Toplu Yükle */}
      <Modal
        open={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Excel ile Öğrenci Listesi Yükle"
        description="Üniversite öğrenci işleri veya OBS çıktısı olan Excel (.xls / .xlsx) dosyasını yükleyin."
      >
        <EnrollmentImport courseId={course.id} />
        <div className="mt-4 flex justify-end border-t border-outline-variant pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setIsImportModalOpen(false);
              router.refresh();
            }}
          >
            Kapat
          </Button>
        </div>
      </Modal>
    </div>
  );
}
