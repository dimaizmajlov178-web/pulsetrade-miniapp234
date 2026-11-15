import { NextResponse, type NextRequest } from "next/server";

import { isDatabaseAvailable } from "@/lib/db";
import { ReferralError, registerReferral } from "@/lib/referral-service";
import { registerReferralSchema } from "@/lib/validation/referral";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  if (!(await isDatabaseAvailable())) {
    return NextResponse.json(
      { error: "Реферальная программа временно недоступна" },
      { status: 503, headers: noStoreHeaders }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Некорректные данные реферальной ссылки" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const parsed = registerReferralSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "Проверьте реферальную ссылку",
        details: parsed.error.flatten(),
      },
      { status: 400, headers: noStoreHeaders }
    );
  }

  try {
    return NextResponse.json(
      { referral: await registerReferral(parsed.data) },
      { headers: noStoreHeaders }
    );
  } catch (error) {
    if (error instanceof ReferralError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status, headers: noStoreHeaders }
      );
    }

    console.error("Не удалось зарегистрировать реферала:", error);

    return NextResponse.json(
      { error: "Не удалось применить реферальную ссылку" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
