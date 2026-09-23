import { redirect } from "next/navigation";

import { auth } from "@/auth";

export default async function PanelRouterPage() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  redirect(session.user.role === "TEACHER" ? "/ogretmen" : "/ogrenci");
}
