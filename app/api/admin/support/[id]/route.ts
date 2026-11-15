import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_ROLE_HEADER, createAdminActor } from "@/lib/admin";
import { isDatabaseAvailable } from "@/lib/db";
import { applyAdminSupportAction, SupportError } from "@/lib/support-service";
import { adminSupportActionSchema } from "@/lib/validation/support";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = createAdminActor(request.headers.get(ADMIN_ROLE_HEADER));

  if (!actor.permissions.canManageSupport) {
    return NextResponse.json(
      { error: "Ваша роль не позволяет работать с обращениями" },
      { status: 403, headers: noStoreHeaders }
    );
  }

  if (!(await isDatabaseAvailable())) {
    return NextResponse.json(
      {
        error: "Работа с обращениями временно недоступна. Попробуйте позже.",
      },
      { status: 503, headers: noStoreHeaders }
    );
  }

  const { id } = await params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Некорректные данные действия с обращением" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const parsed = adminSupportActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "Проверьте данные действия с обращением",
        details: parsed.error.flatten(),
      },
      { status: 400, headers: noStoreHeaders }
    );
  }

  try {
    const ticket = await applyAdminSupportAction(id, parsed.data, actor);

    return NextResponse.json({ ticket }, { headers: noStoreHeaders });
  } catch (error) {
    if (error instanceof SupportError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status, headers: noStoreHeaders }
      );
    }

    console.error("Не удалось обработать обращение:", error);

    return NextResponse.json(
      { error: "Не удалось обработать обращение. Попробуйте ещё раз." },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
