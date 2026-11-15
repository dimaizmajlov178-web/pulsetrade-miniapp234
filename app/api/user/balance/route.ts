import { NextResponse, type NextRequest } from "next/server";

import { isDatabaseAvailable } from "@/lib/db";
import { mockAccount } from "@/lib/mock-data";
import { getOrCreateTelegramAccount, toPublicAccount } from "@/lib/models";
import { readTelegramId } from "@/lib/telegram";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const telegramId = readTelegramId(request.headers);

  if (!(await isDatabaseAvailable())) {
    return NextResponse.json(
      { account: mockAccount },
      { headers: noStoreHeaders }
    );
  }

  try {
    const account = await getOrCreateTelegramAccount(telegramId);

    return NextResponse.json(
      { account: toPublicAccount(account) },
      { headers: noStoreHeaders }
    );
  } catch (error) {
    console.error("Не удалось загрузить баланс пользователя:", error);

    return NextResponse.json(
      { error: "Не удалось загрузить баланс пользователя" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
