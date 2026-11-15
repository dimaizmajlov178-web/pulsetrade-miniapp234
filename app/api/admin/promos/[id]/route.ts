import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_ROLE_HEADER, createAdminActor } from "@/lib/admin";
import { AdminError, updateAdminPromo } from "@/lib/admin-service";
import { isDatabaseAvailable } from "@/lib/db";
import { adminPromoUpdateSchema } from "@/lib/validation/admin";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Некорректные данные промокода" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const parsed = adminPromoUpdateSchema.safeParse(body);

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
    return NextResponse.json(
      await updateAdminPromo(id, parsed.data, actor),
      { headers: noStoreHeaders }
    );
  } catch (error) {
    if (error instanceof AdminError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status, headers: noStoreHeaders }
      );
    }

    console.error("Не удалось обновить промокод:", error);

    return NextResponse.json(
      { error: "Не удалось обновить промокод. Попробуйте ещё раз." },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
