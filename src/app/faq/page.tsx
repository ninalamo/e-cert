import type { Metadata } from "next";
import FaqContent from "@/features/faq/faq-content";

export const metadata: Metadata = {
  title: "FAQ · E-Cert",
  description: "Frequently asked questions about the E-Cert system.",
};

export default function FaqPage() {
  return <FaqContent />;
}
