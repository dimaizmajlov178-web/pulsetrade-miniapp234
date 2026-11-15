import { NextResponse } from "next/server";

import { isDatabaseAvailable } from "@/lib/db";
import { mockAdminWithdrawals } from "@/lib/mock-data";
import { getAdminWithdrawalsState } from "@/lib/withdrawal-service";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET() {
  if (!(await isDatabaseAvailable())) {
    return NextResponse.json(
      { withdrawals: mockAdminWithdrawals },
      { headers: noStoreHeaders }
    );
  }

  try {
    return NextResponse.json(await getAdminWithdrawalsState(), {
      headers: noStoreHeaders,
    });
  } catch (error) {
    console.error("Не удалось загрузить заявки для админ-панели:", error);

    return NextResponse.json(
      { error: "Не удалось загрузить заявки на вывод" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
