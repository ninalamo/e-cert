import type { Metadata } from "next";
import FaqContent from "@/features/faq/faq-content";

export const metadata: Metadata = {
  title: "FAQ · LOA VERICERT",
  description: "Frequently asked questions about the LOA VERICERT system.",
};

export default function FaqPage() {
  return <FaqContent />;
}
