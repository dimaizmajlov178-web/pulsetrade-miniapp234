import { NextResponse, type NextRequest } from "next/server";

import { checkDeposit, DepositError } from "@/lib/deposit-service";
import { isDatabaseAvailable } from "@/lib/db";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isDatabaseAvailable())) {
    return NextResponse.json(
      { error: "Проверка платежей временно недоступна." },
      { status: 503, headers: noStoreHeaders }
    );
  }

  const { id } = await params;

  try {
    return NextResponse.json(await checkDeposit(id), {
      headers: noStoreHeaders,
    });
  } catch (error) {
    if (error instanceof DepositError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status, headers: noStoreHeaders }
      );
    }

    console.error("Не удалось проверить пополнение:", error);

    return NextResponse.json(
      { error: "Не удалось проверить платёж. Попробуйте ещё раз." },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
