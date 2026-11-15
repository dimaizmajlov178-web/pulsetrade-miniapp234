import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_ROLE_HEADER, createAdminActor } from "@/lib/admin";
import { getAdminAuditState } from "@/lib/admin-service";
import { isDatabaseAvailable } from "@/lib/db";
import { mockAdminAuditLog } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const actor = createAdminActor(request.headers.get(ADMIN_ROLE_HEADER));

  if (!actor.permissions.canViewAudit) {
    return NextResponse.json(
      { error: "Ваша роль не позволяет просматривать журнал" },
      { status: 403, headers: noStoreHeaders }
    );
  }

  if (!(await isDatabaseAvailable())) {
    return NextResponse.json(mockAdminAuditLog, {
      headers: noStoreHeaders,
    });
  }

  try {
    return NextResponse.json(await getAdminAuditState(), {
      headers: noStoreHeaders,
    });
  } catch (error) {
    console.error("Не удалось загрузить журнал действий:", error);

    return NextResponse.json(
      { error: "Не удалось загрузить журнал действий" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
