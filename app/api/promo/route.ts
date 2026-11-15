import { NextResponse, type NextRequest } from "next/server";

import { isDatabaseAvailable } from "@/lib/db";
import {
  mockAccount,
  mockBonusActivations,
  mockWageringPercent,
} from "@/lib/mock-data";
import {
  activatePromoCode,
  getPromoState,
  PromoError,
} from "@/lib/promo-service";
import { activatePromoCodeSchema } from "@/lib/validation/promo";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET() {
  if (!(await isDatabaseAvailable())) {
    return NextResponse.json(
      {
        account: mockAccount,
        activations: mockBonusActivations,
        wageringPercent: mockWageringPercent,
      },
      { headers: noStoreHeaders }
    );
  }

  try {
    return NextResponse.json(await getPromoState(), {
      headers: noStoreHeaders,
    });
  } catch (error) {
    console.error("Не удалось загрузить промокоды:", error);

    return NextResponse.json(
      { error: "Не удалось загрузить бонусы" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await isDatabaseAvailable())) {
    return NextResponse.json(
      { error: "Активация промокодов временно недоступна. Попробуйте позже." },
      { status: 503, headers: noStoreHeaders }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Некорректные данные промокода" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const parsed = activatePromoCodeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Проверьте промокод",
        details: parsed.error.flatten(),
      },
      { status: 400, headers: noStoreHeaders }
    );
  }

  try {
    const result = await activatePromoCode(parsed.data);

    return NextResponse.json(result, {
      status: 201,
      headers: noStoreHeaders,
    });
  } catch (error) {
    if (error instanceof PromoError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status, headers: noStoreHeaders }
      );
    }

    console.error("Не удалось активировать промокод:", error);

    return NextResponse.json(
      { error: "Не удалось активировать промокод. Попробуйте ещё раз." },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
