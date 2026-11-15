import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_ROLE_HEADER, createAdminActor } from "@/lib/admin";
import {
  AdminError,
  adjustUserBalances,
} from "@/lib/admin-service";
import { isDatabaseAvailable } from "@/lib/db";
import { adminBalanceAdjustmentSchema } from "@/lib/validation/admin";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const actor = createAdminActor(request.headers.get(ADMIN_ROLE_HEADER));

  if (!actor.permissions.canAdjustBalances) {
    return NextResponse.json(
      { error: "Ваша роль не позволяет изменять балансы" },
      { status: 403, headers: noStoreHeaders }
    );
  }

  const { uid: rawUid } = await params;
  const uid = Number(rawUid);

  if (!Number.isInteger(uid) || uid <= 0) {
    return NextResponse.json(
      { error: "Укажите корректный UID" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  if (!(await isDatabaseAvailable())) {
    return NextResponse.json(
      { error: "Изменение балансов временно недоступно" },
      { status: 503, headers: noStoreHeaders }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Некорректные данные корректировки" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const parsed = adminBalanceAdjustmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "Проверьте данные корректировки",
        details: parsed.error.flatten(),
      },
      { status: 400, headers: noStoreHeaders }
    );
  }

  try {
    return NextResponse.json(
      { detail: await adjustUserBalances(uid, parsed.data, actor) },
      { headers: noStoreHeaders }
    );
  } catch (error) {
    if (error instanceof AdminError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status, headers: noStoreHeaders }
      );
    }

    console.error("Не удалось изменить баланс:", error);

    return NextResponse.json(
      { error: "Не удалось изменить баланс. Попробуйте ещё раз." },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
