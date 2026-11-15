import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_ROLE_HEADER, createAdminActor } from "@/lib/admin";
import {
  AdminError,
  getAdminUserDetail,
  getAdminUsersState,
} from "@/lib/admin-service";
import { isDatabaseAvailable } from "@/lib/db";
import {
  mockAdminUserDetail,
  mockAdminUsers,
} from "@/lib/mock-data";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const actor = createAdminActor(request.headers.get(ADMIN_ROLE_HEADER));

  if (!actor.permissions.canViewUsers) {
    return NextResponse.json(
      { error: "Недостаточно прав для просмотра пользователей" },
      { status: 403, headers: noStoreHeaders }
    );
  }

  const rawUid = request.nextUrl.searchParams.get("uid");

  if (rawUid !== null) {
    const uid = Number(rawUid);

    if (!Number.isInteger(uid) || uid <= 0) {
      return NextResponse.json(
        { error: "Укажите корректный UID" },
        { status: 400, headers: noStoreHeaders }
      );
    }

    if (!(await isDatabaseAvailable())) {
      const summary = mockAdminUsers.find((user) => user.uid === uid);

      if (!summary) {
        return NextResponse.json(
          { error: "Пользователь с таким UID не найден" },
          { status: 404, headers: noStoreHeaders }
        );
      }

      return NextResponse.json(
        {
          detail:
            uid === mockAdminUserDetail.user.uid
              ? mockAdminUserDetail
              : { user: summary, trades: [], operations: [] },
        },
        { headers: noStoreHeaders }
      );
    }

    try {
      return NextResponse.json(
        { detail: await getAdminUserDetail(uid) },
        { headers: noStoreHeaders }
      );
    } catch (error) {
      if (error instanceof AdminError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.status, headers: noStoreHeaders }
        );
      }

      console.error("Не удалось загрузить пользователя:", error);

      return NextResponse.json(
        { error: "Не удалось загрузить пользователя" },
        { status: 500, headers: noStoreHeaders }
      );
    }
  }

  if (!(await isDatabaseAvailable())) {
    return NextResponse.json(
      { users: mockAdminUsers },
      { headers: noStoreHeaders }
    );
  }

  try {
    return NextResponse.json(await getAdminUsersState(), {
      headers: noStoreHeaders,
    });
  } catch (error) {
    console.error("Не удалось загрузить пользователей:", error);

    return NextResponse.json(
      { error: "Не удалось загрузить пользователей" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
