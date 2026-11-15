import type { Metadata } from "next";

import { SupportScreen } from "@/components/support-screen";

export const metadata: Metadata = {
  title: "Поддержка — PulseTrade",
  description: "Чат поддержки и история обращений",
};

export default function SupportPage() {
  return <SupportScreen />;
}
