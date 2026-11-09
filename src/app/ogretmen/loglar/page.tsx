import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/authorization";

export default async function TeacherLogsPage() {
  try {
    await requireAdmin();
  } catch {
    redirect("/ogretmen");
  }

  redirect("/admin/loglar");
}
