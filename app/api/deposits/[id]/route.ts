import { NextResponse, type NextRequest } from "next/server";

import { DepositError, getDepositState } from "@/lib/deposit-service";
import { depositLimitsConfig } from "@/lib/deposits";
import { isDatabaseAvailable } from "@/lib/db";
import { mockAccount, mockDeposits } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!(await isDatabaseAvailable())) {
    const deposit = mockDeposits.find((item) => item.id === id);

    if (!deposit) {
      return NextResponse.json(
        { error: "Пополнение не найдено" },
        { status: 404, headers: noStoreHeaders }
      );
    }

    return NextResponse.json(
      {
        account: mockAccount,
        deposit,
        limits: depositLimitsConfig,
      },
      { headers: noStoreHeaders }
    );
  }

  try {
    return NextResponse.json(await getDepositState(id), {
      headers: noStoreHeaders,
    });
  } catch (error) {
    if (error instanceof DepositError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status, headers: noStoreHeaders }
      );
    }

    console.error("Не удалось загрузить пополнение:", error);

    return NextResponse.json(
      { error: "Не удалось загрузить пополнение" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
