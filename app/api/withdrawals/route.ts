import { NextResponse, type NextRequest } from "next/server";

import { isDatabaseAvailable } from "@/lib/db";
import { mockAccount, mockWithdrawals } from "@/lib/mock-data";
import { roundMoney } from "@/lib/trading";
import {
  createWithdrawal,
  getWithdrawalsState,
  WithdrawalError,
} from "@/lib/withdrawal-service";
import {
  withdrawalLimitsConfig,
  type PublicWithdrawal,
} from "@/lib/withdrawals";
import { createWithdrawalSchema } from "@/lib/validation/withdrawal";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

function getMockAvailableBalance(withdrawals: PublicWithdrawal[]) {
  const reserved = withdrawals
    .filter((withdrawal) => withdrawal.status === "pending")
    .reduce((total, withdrawal) => total + withdrawal.amount, 0);

  return roundMoney(mockAccount.balance - reserved);
}

export async function GET() {
  if (!(await isDatabaseAvailable())) {
    return NextResponse.json(
      {
        account: mockAccount,
        withdrawals: mockWithdrawals,
        limits: withdrawalLimitsConfig,
        availableBalance: getMockAvailableBalance(mockWithdrawals),
      },
      { headers: noStoreHeaders }
    );
  }

  try {
    return NextResponse.json(await getWithdrawalsState(), {
      headers: noStoreHeaders,
    });
  } catch (error) {
    console.error("Не удалось загрузить выводы:", error);

    return NextResponse.json(
      { error: "Не удалось загрузить заявки на вывод" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await isDatabaseAvailable())) {
    return NextResponse.json(
      { error: "Вывод средств временно недоступен. Попробуйте позже." },
      { status: 503, headers: noStoreHeaders }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Некорректные данные заявки на вывод" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const parsed = createWithdrawalSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "Проверьте данные заявки на вывод",
        details: parsed.error.flatten(),
      },
      { status: 400, headers: noStoreHeaders }
    );
  }

  try {
    const result = await createWithdrawal(parsed.data);

    return NextResponse.json(result, {
      status: 201,
      headers: noStoreHeaders,
    });
  } catch (error) {
    if (error instanceof WithdrawalError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status, headers: noStoreHeaders }
      );
    }

    console.error("Не удалось создать заявку на вывод:", error);

    return NextResponse.json(
      { error: "Не удалось создать заявку на вывод. Попробуйте ещё раз." },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
