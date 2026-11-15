import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_ROLE_HEADER, createAdminActor } from "@/lib/admin";
import { isDatabaseAvailable } from "@/lib/db";
import { mockAccount, mockWithdrawals } from "@/lib/mock-data";
import { roundMoney } from "@/lib/trading";
import {
  getWithdrawalState,
  markWithdrawalPaid,
  markWithdrawalRejected,
  WithdrawalError,
} from "@/lib/withdrawal-service";
import {
  withdrawalLimitsConfig,
  type PublicWithdrawal,
} from "@/lib/withdrawals";
import { withdrawalDecisionSchema } from "@/lib/validation/withdrawal";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

function getMockAvailableBalance(withdrawals: PublicWithdrawal[]) {
  const reserved = withdrawals
    .filter((withdrawal) => withdrawal.status === "pending")
    .reduce((total, withdrawal) => total + withdrawal.amount, 0);

  return roundMoney(mockAccount.balance - reserved);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!(await isDatabaseAvailable())) {
    const withdrawal = mockWithdrawals.find((item) => item.id === id);

    if (!withdrawal) {
      return NextResponse.json(
        { error: "Заявка не найдена" },
        { status: 404, headers: noStoreHeaders }
      );
    }

    return NextResponse.json(
      {
        account: mockAccount,
        withdrawal,
        limits: withdrawalLimitsConfig,
        availableBalance: getMockAvailableBalance(mockWithdrawals),
      },
      { headers: noStoreHeaders }
    );
  }

  try {
    return NextResponse.json(await getWithdrawalState(id), {
      headers: noStoreHeaders,
    });
  } catch (error) {
    if (error instanceof WithdrawalError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status, headers: noStoreHeaders }
      );
    }

    console.error("Не удалось загрузить заявку на вывод:", error);

    return NextResponse.json(
      { error: "Не удалось загрузить заявку на вывод" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = createAdminActor(request.headers.get(ADMIN_ROLE_HEADER));

  if (!actor.permissions.canManageWithdrawals) {
    return NextResponse.json(
      { error: "Ваша роль не позволяет обрабатывать выплаты" },
      { status: 403, headers: noStoreHeaders }
    );
  }

  if (!(await isDatabaseAvailable())) {
    return NextResponse.json(
      {
        error:
          "Обработка заявок на вывод временно недоступна. Попробуйте позже.",
      },
      { status: 503, headers: noStoreHeaders }
    );
  }

  const { id } = await params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Некорректные данные решения по заявке" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const parsed = withdrawalDecisionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "Проверьте данные решения по заявке",
        details: parsed.error.flatten(),
      },
      { status: 400, headers: noStoreHeaders }
    );
  }

  try {
    const result =
      parsed.data.action === "pay"
        ? await markWithdrawalPaid(id, actor)
        : await markWithdrawalRejected(id, parsed.data.reason, actor);

    return NextResponse.json(result, { headers: noStoreHeaders });
  } catch (error) {
    if (error instanceof WithdrawalError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status, headers: noStoreHeaders }
      );
    }

    console.error("Не удалось обработать заявку на вывод:", error);

    return NextResponse.json(
      { error: "Не удалось обработать заявку. Попробуйте ещё раз." },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
