"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/icons";
import { StatusMessage } from "@/components/ui/status-message";

type Teacher = {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date | string;
  hasPassword: boolean;
  _count: { taughtCourses: number };
};

type ApiBody = { error?: { message?: string }; data?: unknown };

export function TeacherManager({ initialTeachers }: { initialTeachers: Teacher[] }) {
  const router = useRouter();
  const [teachers, setTeachers] = useState(initialTeachers);
  const [pendingAction, setPendingAction] = useState<string>();
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [deleteTarget, setDeleteTarget] = useState<Teacher>();
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [resetTarget, setResetTarget] = useState<Teacher>();
  const [temporaryPassword, setTemporaryPassword] = useState("");

  function clearMessages() {
    setError(undefined);
    setSuccess(undefined);
  }

  async function createTeacher(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();
    setPendingAction("create");
    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      const response = await fetch("/api/admin/teachers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          temporaryPassword: formData.get("temporaryPassword"),
        }),
      });
      const body = (await response.json()) as ApiBody;
      if (!response.ok) throw new Error(body.error?.message ?? "Öğretmen eklenemedi.");
      form.reset();
      setSuccess("Öğretmen hesabı oluşturuldu. Geçici şifreyi öğretmenle güvenli biçimde paylaşın.");
      router.refresh();
      const refreshed = await fetch("/api/admin/teachers").then((result) => result.json());
      if (refreshed.data) setTeachers(refreshed.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Öğretmen eklenemedi.");
    } finally {
      setPendingAction(undefined);
    }
  }

  async function impersonate(teacher: Teacher) {
    clearMessages();
    setPendingAction(`impersonate:${teacher.id}`);
    try {
      const response = await fetch(`/api/admin/teachers/${teacher.id}/impersonate`, {
        method: "POST",
      });
      const body = (await response.json()) as ApiBody & { data?: { redirectTo?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "Öğretmen hesabına geçilemedi.");
      router.push(body.data?.redirectTo ?? "/ogretmen");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Öğretmen hesabına geçilemedi.");
      setPendingAction(undefined);
    }
  }

  async function resetPassword() {
    if (!resetTarget) return;
    clearMessages();
    setPendingAction(`reset:${resetTarget.id}`);
    try {
      const response = await fetch(`/api/admin/teachers/${resetTarget.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ temporaryPassword }),
      });
      const body = (await response.json()) as ApiBody;
      if (!response.ok) throw new Error(body.error?.message ?? "Şifre yenilenemedi.");
      setResetTarget(undefined);
      setTemporaryPassword("");
      setSuccess("Öğretmenin geçici şifresi yenilendi. Mevcut oturumları kapatıldı.");
      setTeachers((current) => current.map((item) =>
        item.id === resetTarget.id ? { ...item, hasPassword: true } : item,
      ));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Şifre yenilenemedi.");
    } finally {
      setPendingAction(undefined);
    }
  }

  async function removeTeacher() {
    if (!deleteTarget) return;
    clearMessages();
    setPendingAction(`delete:${deleteTarget.id}`);
    try {
      const response = await fetch(`/api/admin/teachers/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmationEmail: deleteConfirmation }),
      });
      const body = (await response.json()) as ApiBody;
      if (!response.ok) throw new Error(body.error?.message ?? "Öğretmen silinemedi.");
      setTeachers((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(undefined);
      setDeleteConfirmation("");
      setSuccess("Öğretmen hesabı ve hesaba bağlı ders verileri silindi.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Öğretmen silinemedi.");
    } finally {
      setPendingAction(undefined);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.28fr)] lg:items-start">
      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6">
        <h2 className="font-h3 text-h3 text-on-surface">Yeni öğretmen hesabı</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Öğretmen ilk girişini bu e-posta ve geçici şifreyle yapar.
        </p>
        <form onSubmit={createTeacher} className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-on-surface">
            Ad soyad
            <input name="name" required maxLength={120} className="mt-1.5 min-h-11 w-full rounded-lg border border-outline-variant bg-white px-3 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20" />
          </label>
          <label className="block text-sm font-medium text-on-surface">
            E-posta
            <input name="email" type="email" required className="mt-1.5 min-h-11 w-full rounded-lg border border-outline-variant bg-white px-3 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20" />
          </label>
          <label className="block text-sm font-medium text-on-surface">
            Geçici şifre
            <input name="temporaryPassword" type="password" required minLength={10} autoComplete="new-password" className="mt-1.5 min-h-11 w-full rounded-lg border border-outline-variant bg-white px-3 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20" />
            <span className="mt-1 block text-xs font-normal text-on-surface-variant">En az 10 karakter; büyük harf, küçük harf ve rakam içermeli.</span>
          </label>
          <Button type="submit" className="w-full gap-2" disabled={pendingAction === "create"}>
            <MaterialIcon name="person_add" />
            {pendingAction === "create" ? "Oluşturuluyor…" : "Öğretmeni Ekle"}
          </Button>
        </form>
      </section>

      <section className="min-w-0 rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="border-b border-outline-variant px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-h3 text-h3 text-on-surface">Öğretmen hesapları</h2>
              <p className="mt-1 text-sm text-on-surface-variant">{teachers.length} aktif öğretmen</p>
            </div>
            <Badge variant="code">{teachers.length}</Badge>
          </div>
        </div>

        {(error || success) && (
          <div className="space-y-3 border-b border-outline-variant p-4">
            {error && <StatusMessage variant="error">{error}</StatusMessage>}
            {success && <StatusMessage variant="success">{success}</StatusMessage>}
          </div>
        )}

        {teachers.length === 0 ? (
          <div className="p-8 text-center text-sm text-on-surface-variant">Henüz öğretmen hesabı bulunmuyor.</div>
        ) : (
          <div className="divide-y divide-outline-variant">
            {teachers.map((teacher) => (
              <article key={teacher.id} className="p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold text-on-surface">{teacher.name ?? "İsimsiz öğretmen"}</h3>
                      {!teacher.hasPassword && <Badge variant="warning">Şifre bekliyor</Badge>}
                    </div>
                    <p className="mt-1 truncate text-sm text-on-surface-variant">{teacher.email}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">{teacher._count.taughtCourses} ders</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" onClick={() => void impersonate(teacher)} disabled={Boolean(pendingAction)}>
                      {pendingAction === `impersonate:${teacher.id}` ? "Geçiliyor…" : "Hesabına Gir"}
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => { clearMessages(); setResetTarget(teacher); setTemporaryPassword(""); }} disabled={Boolean(pendingAction)}>
                      Şifre Yenile
                    </Button>
                    <Button type="button" variant="danger" size="sm" onClick={() => { clearMessages(); setDeleteTarget(teacher); setDeleteConfirmation(""); }} disabled={Boolean(pendingAction)}>
                      Sil
                    </Button>
                  </div>
                </div>

                {resetTarget?.id === teacher.id && (
                  <div className="mt-4 rounded-xl border border-outline-variant bg-surface-container-low p-4">
                    <label className="block text-sm font-medium text-on-surface">
                      Yeni geçici şifre
                      <input value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} type="password" minLength={10} autoComplete="new-password" className="mt-1.5 min-h-11 w-full rounded-lg border border-outline-variant bg-white px-3 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20" />
                    </label>
                    <div className="mt-3 flex justify-end gap-2">
                      <Button type="button" variant="secondary" size="sm" onClick={() => setResetTarget(undefined)}>İptal</Button>
                      <Button type="button" size="sm" onClick={() => void resetPassword()} disabled={temporaryPassword.length < 10 || Boolean(pendingAction)}>Geçici Şifreyi Kaydet</Button>
                    </div>
                  </div>
                )}

                {deleteTarget?.id === teacher.id && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50/70 p-4">
                    <p className="text-sm font-semibold text-red-950">Bu işlem geri alınamaz.</p>
                    <p className="mt-1 text-xs leading-relaxed text-red-800">Öğretmen hesabı, {teacher._count.taughtCourses} dersi ve bu derslere bağlı yoklama verileri silinecek. Onaylamak için <strong>{teacher.email}</strong> yazın.</p>
                    <input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} type="email" className="mt-3 min-h-11 w-full rounded-lg border border-red-300 bg-white px-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200" />
                    <div className="mt-3 flex justify-end gap-2">
                      <Button type="button" variant="secondary" size="sm" onClick={() => setDeleteTarget(undefined)}>İptal</Button>
                      <Button type="button" variant="critical" size="sm" onClick={() => void removeTeacher()} disabled={deleteConfirmation.trim().toLowerCase() !== teacher.email.toLowerCase() || Boolean(pendingAction)}>
                        Hesabı ve Verileri Sil
                      </Button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
