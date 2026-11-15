import { NextResponse, type NextRequest } from "next/server";

import { isDatabaseAvailable } from "@/lib/db";
import { mockAccount, mockTrades } from "@/lib/mock-data";
import { tradingLimits } from "@/lib/trading";
import {
  getTradingState,
  placeTrade,
  TradingError,
} from "@/lib/trading-service";
import { createTradeSchema } from "@/lib/validation/trade";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET() {
  if (!(await isDatabaseAvailable())) {
    return NextResponse.json(
      {
        account: mockAccount,
        trades: mockTrades,
        limits: tradingLimits,
      },
      { headers: noStoreHeaders }
    );
  }

  try {
    return NextResponse.json(await getTradingState(), {
      headers: noStoreHeaders,
    });
  } catch (error) {
    console.error("Не удалось загрузить состояние счёта:", error);

    return NextResponse.json(
      { error: "Не удалось загрузить состояние счёта" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await isDatabaseAvailable())) {
    return NextResponse.json(
      { error: "Ставки временно недоступны. Попробуйте позже." },
      { status: 503, headers: noStoreHeaders }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Некорректные данные ставки" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const parsed = createTradeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Проверьте параметры ставки",
        details: parsed.error.flatten(),
      },
      { status: 400, headers: noStoreHeaders }
    );
  }

  try {
    const result = await placeTrade(parsed.data);

    return NextResponse.json(result, {
      status: 201,
      headers: noStoreHeaders,
    });
  } catch (error) {
    if (error instanceof TradingError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status, headers: noStoreHeaders }
      );
    }

    console.error("Не удалось подтвердить ставку:", error);

    return NextResponse.json(
      { error: "Не удалось подтвердить ставку. Попробуйте ещё раз." },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
