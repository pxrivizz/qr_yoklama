"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";

type MemberRole = "OWNER" | "INSTRUCTOR" | "ASSISTANT";
type Member = {
  role: MemberRole;
  user: { id: string; name: string | null; email: string };
};

const roleLabels: Record<MemberRole, string> = {
  OWNER: "Öğretim elemanı",
  INSTRUCTOR: "Öğretim elemanı",
  ASSISTANT: "Asistan",
};

export function CourseMembersManager({
  courseId,
  currentUserId,
  initialMembers,
}: {
  courseId: string;
  currentUserId: string;
  initialMembers: Member[];
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<MemberRole, "OWNER">>("ASSISTANT");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ variant: "success" | "error"; text: string }>();
  const canManage = members.some((member) => member.user.id === currentUserId && member.role === "OWNER");

  async function refreshMembers() {
    const response = await fetch(`/api/courses/${courseId}/members`);
    const body = await response.json();
    if (response.ok) setMembers(body.data);
  }

  async function addMember(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(undefined);
    try {
      const response = await fetch(`/api/courses/${courseId}/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Ders üyesi eklenemedi.");
      await refreshMembers();
      setEmail("");
      setMessage({ variant: "success", text: "Ders üyesi kaydedildi." });
      router.refresh();
    } catch (error) {
      setMessage({ variant: "error", text: error instanceof Error ? error.message : "İşlem tamamlanamadı." });
    } finally {
      setPending(false);
    }
  }

  async function changeRole(userId: string, nextRole: Exclude<MemberRole, "OWNER">) {
    setPending(true);
    try {
      const response = await fetch(`/api/courses/${courseId}/members/${userId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Üye rolü değiştirilemedi.");
      await refreshMembers();
    } catch (error) {
      setMessage({ variant: "error", text: error instanceof Error ? error.message : "İşlem tamamlanamadı." });
    } finally {
      setPending(false);
    }
  }

  async function removeMember(userId: string) {
    setPending(true);
    try {
      const response = await fetch(`/api/courses/${courseId}/members/${userId}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message ?? "Ders üyesi çıkarılamadı.");
      }
      setMembers((current) => current.filter((member) => member.user.id !== userId));
    } catch (error) {
      setMessage({ variant: "error", text: error instanceof Error ? error.message : "İşlem tamamlanamadı." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="divide-y divide-outline-variant overflow-hidden rounded-lg border border-outline-variant">
        {members.map((member) => (
          <div key={member.user.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-on-surface">{member.user.name ?? member.user.email}</p>
              <p className="text-sm text-on-surface-variant">{member.user.email} · {roleLabels[member.role]}</p>
            </div>
            {canManage && member.role !== "OWNER" && (
              <div className="flex gap-2">
                <select
                  value={member.role}
                  disabled={pending}
                  onChange={(event) => void changeRole(member.user.id, event.target.value as Exclude<MemberRole, "OWNER">)}
                  className="min-h-10 rounded-lg border border-outline-variant bg-white px-3 text-sm"
                >
                  <option value="INSTRUCTOR">Öğretim elemanı</option>
                  <option value="ASSISTANT">Asistan</option>
                </select>
                <Button type="button" variant="danger" size="sm" disabled={pending} onClick={() => void removeMember(member.user.id)}>
                  Çıkar
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {canManage && (
        <form onSubmit={addMember} className="grid gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
          <label className="text-sm font-medium text-on-surface">
            Öğretmen e-postası
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required className="mt-1.5 min-h-11 w-full rounded-lg border border-outline-variant bg-white px-3" />
          </label>
          <label className="text-sm font-medium text-on-surface">
            Ders rolü
            <select value={role} onChange={(event) => setRole(event.target.value as Exclude<MemberRole, "OWNER">)} className="mt-1.5 min-h-11 w-full rounded-lg border border-outline-variant bg-white px-3">
              <option value="INSTRUCTOR">Öğretim elemanı</option>
              <option value="ASSISTANT">Asistan</option>
            </select>
          </label>
          <Button type="submit" disabled={pending}>{pending ? "Kaydediliyor…" : "Üye ekle"}</Button>
        </form>
      )}
      {message && <StatusMessage variant={message.variant}>{message.text}</StatusMessage>}
    </div>
  );
}
