import type { Metadata } from "next";

import { TutorialDemo } from "@/components/tutorial/tutorial-demo";

export const metadata: Metadata = {
  title: "Kullanım Rehberi | DersDevam",
  description: "DersDevam öğrenci ve öğretim elemanı kullanım rehberi prototipi.",
};

export default function TutorialDemoPage() {
  return <TutorialDemo />;
}
