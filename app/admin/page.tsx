import type { Metadata } from "next";

import { AdminConsole } from "@/components/admin-console";

export const metadata: Metadata = {
  title: "Админ-панель — PulseTrade",
  description:
    "Управление пользователями, балансами, лимитами, промокодами и заявками",
};

export default function AdminPage() {
  return <AdminConsole />;
}
