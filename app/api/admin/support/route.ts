import { NextResponse } from "next/server";

import { isDatabaseAvailable } from "@/lib/db";
import { mockAdminSupportTickets } from "@/lib/mock-data";
import { getAdminSupportState } from "@/lib/support-service";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET() {
  if (!(await isDatabaseAvailable())) {
    return NextResponse.json(
      { tickets: mockAdminSupportTickets },
      { headers: noStoreHeaders }
    );
  }

  try {
    return NextResponse.json(await getAdminSupportState(), {
      headers: noStoreHeaders,
    });
  } catch (error) {
    console.error("Не удалось загрузить обращения для админ-панели:", error);

    return NextResponse.json(
      { error: "Не удалось загрузить обращения поддержки" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
