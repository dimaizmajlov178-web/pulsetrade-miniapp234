import { NextResponse, type NextRequest } from "next/server";

import { isDatabaseAvailable } from "@/lib/db";
import {
  createReferralWithdrawal,
  ReferralError,
} from "@/lib/referral-service";
import { createReferralWithdrawalSchema } from "@/lib/validation/referral";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  if (!(await isDatabaseAvailable())) {
    return NextResponse.json(
      { error: "Вывод реферальных средств временно недоступен" },
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

  const parsed = createReferralWithdrawalSchema.safeParse(body);

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
    return NextResponse.json(
      { referral: await createReferralWithdrawal(parsed.data) },
      { status: 201, headers: noStoreHeaders }
    );
  } catch (error) {
    if (error instanceof ReferralError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status, headers: noStoreHeaders }
      );
    }

    console.error("Не удалось создать заявку на вывод реферальных:", error);

    return NextResponse.json(
      { error: "Не удалось создать заявку на вывод. Попробуйте ещё раз." },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
