import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_ROLE_HEADER, createAdminActor } from "@/lib/admin";
import {
  AdminError,
  createAdminPromo,
  getAdminPromosState,
} from "@/lib/admin-service";
import { isDatabaseAvailable } from "@/lib/db";
import { mockAdminPromos } from "@/lib/mock-data";
import { adminPromoCreateSchema } from "@/lib/validation/admin";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET() {
  if (!(await isDatabaseAvailable())) {
    return NextResponse.json(mockAdminPromos, {
      headers: noStoreHeaders,
    });
  }

  try {
    return NextResponse.json(await getAdminPromosState(), {
      headers: noStoreHeaders,
    });
  } catch (error) {
    console.error("Не удалось загрузить промокоды:", error);

    return NextResponse.json(
      { error: "Не удалось загрузить промокоды" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  const actor = createAdminActor(request.headers.get(ADMIN_ROLE_HEADER));

  if (!actor.permissions.canManagePromos) {
    return NextResponse.json(
      { error: "Ваша роль не позволяет управлять промокодами" },
      { status: 403, headers: noStoreHeaders }
    );
  }

  if (!(await isDatabaseAvailable())) {
    return NextResponse.json(
      { error: "Управление промокодами временно недоступно" },
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

  const parsed = adminPromoCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "Проверьте данные промокода",
        details: parsed.error.flatten(),
      },
      { status: 400, headers: noStoreHeaders }
    );
  }

  try {
    return NextResponse.json(await createAdminPromo(parsed.data, actor), {
      status: 201,
      headers: noStoreHeaders,
    });
  } catch (error) {
    if (error instanceof AdminError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status, headers: noStoreHeaders }
      );
    }

    console.error("Не удалось создать промокод:", error);

    return NextResponse.json(
      { error: "Не удалось создать промокод. Попробуйте ещё раз." },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
