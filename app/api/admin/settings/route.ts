import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_ROLE_HEADER, createAdminActor } from "@/lib/admin";
import {
  getAdminLimitsState,
  updateAdminLimits,
} from "@/lib/admin-service";
import { isDatabaseAvailable } from "@/lib/db";
import { mockAdminLimits } from "@/lib/mock-data";
import { adminLimitsSchema } from "@/lib/validation/admin";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET() {
  if (!(await isDatabaseAvailable())) {
    return NextResponse.json(mockAdminLimits, {
      headers: noStoreHeaders,
    });
  }

  try {
    return NextResponse.json(await getAdminLimitsState(), {
      headers: noStoreHeaders,
    });
  } catch (error) {
    console.error("Не удалось загрузить лимиты:", error);

    return NextResponse.json(
      { error: "Не удалось загрузить лимиты платформы" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const actor = createAdminActor(request.headers.get(ADMIN_ROLE_HEADER));

  if (!actor.permissions.canManageLimits) {
    return NextResponse.json(
      { error: "Ваша роль не позволяет изменять лимиты" },
      { status: 403, headers: noStoreHeaders }
    );
  }

  if (!(await isDatabaseAvailable())) {
    return NextResponse.json(
      { error: "Изменение лимитов временно недоступно" },
      { status: 503, headers: noStoreHeaders }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Некорректные данные лимитов" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const parsed = adminLimitsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Проверьте данные лимитов",
        details: parsed.error.flatten(),
      },
      { status: 400, headers: noStoreHeaders }
    );
  }

  try {
    return NextResponse.json(await updateAdminLimits(parsed.data, actor), {
      headers: noStoreHeaders,
    });
  } catch (error) {
    console.error("Не удалось сохранить лимиты:", error);

    return NextResponse.json(
      { error: "Не удалось сохранить лимиты. Попробуйте ещё раз." },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
