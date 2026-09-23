import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { QrScanner } from "@/components/student/qr-scanner";
import { prisma } from "@/lib/db";

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");
  if (session.user.role !== "STUDENT") redirect("/ogretmen");

  const student = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true, schoolNumber: true },
  });

  if (!student?.image) {
    redirect("/ogrenci?uyari=fotograf_gerekli");
  }

  if (!student.schoolNumber) {
    redirect("/ogrenci?uyari=numara_gerekli");
  }

  const { token } = await searchParams;
  return <QrScanner initialToken={typeof token === "string" ? token : undefined} />;
}
