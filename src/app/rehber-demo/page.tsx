import type { Metadata } from "next";

import { TutorialDemo } from "@/components/tutorial/tutorial-demo";

export const metadata: Metadata = {
  title: "Kullanım Rehberi",
  alternates: { canonical: "/rehber-demo" },
  description: "DersDevam öğrenci ve öğretim elemanı kullanım rehberi prototipi.",
};

export default function TutorialDemoPage() {
  return <TutorialDemo />;
}
