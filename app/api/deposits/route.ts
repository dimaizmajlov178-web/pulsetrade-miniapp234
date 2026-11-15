import { NextResponse, type NextRequest } from "next/server";

import {
  createDeposit,
  DepositError,
  getDepositsState,
} from "@/lib/deposit-service";
import { depositLimitsConfig } from "@/lib/deposits";
import { isDatabaseAvailable } from "@/lib/db";
import { mockAccount, mockDeposits } from "@/lib/mock-data";
import { createDepositSchema } from "@/lib/validation/deposit";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET() {
  if (!(await isDatabaseAvailable())) {
    return NextResponse.json(
      {
        account: mockAccount,
        deposits: mockDeposits,
        limits: depositLimitsConfig,
      },
      { headers: noStoreHeaders }
    );
  }

  try {
    return NextResponse.json(await getDepositsState(), {
      headers: noStoreHeaders,
    });
  } catch (error) {
    console.error("Не удалось загрузить пополнения:", error);

    return NextResponse.json(
      { error: "Не удалось загрузить пополнения" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await isDatabaseAvailable())) {
    return NextResponse.json(
      { error: "Пополнения временно недоступны. Попробуйте позже." },
      { status: 503, headers: noStoreHeaders }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Некорректные данные пополнения" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const parsed = createDepositSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Проверьте сумму пополнения",
        details: parsed.error.flatten(),
      },
      { status: 400, headers: noStoreHeaders }
    );
  }

  try {
    const result = await createDeposit(parsed.data);

    return NextResponse.json(result, {
      status: 201,
      headers: noStoreHeaders,
    });
  } catch (error) {
    if (error instanceof DepositError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status, headers: noStoreHeaders }
      );
    }

    console.error("Не удалось создать пополнение:", error);

    return NextResponse.json(
      { error: "Не удалось создать пополнение. Попробуйте ещё раз." },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
