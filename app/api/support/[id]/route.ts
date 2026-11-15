import { NextResponse, type NextRequest } from "next/server";

import { isDatabaseAvailable } from "@/lib/db";
import { closeSupportTicketForUser, SupportError } from "@/lib/support-service";
import { supportCloseSchema } from "@/lib/validation/support";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isDatabaseAvailable())) {
    return NextResponse.json(
      { error: "Чат поддержки временно недоступен. Попробуйте позже." },
      { status: 503, headers: noStoreHeaders }
    );
  }

  const { id } = await params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Некорректные данные обращения" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const parsed = supportCloseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Некорректное действие с обращением" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  try {
    return NextResponse.json(await closeSupportTicketForUser(id), {
      headers: noStoreHeaders,
    });
  } catch (error) {
    if (error instanceof SupportError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status, headers: noStoreHeaders }
      );
    }

    console.error("Не удалось закрыть обращение:", error);

    return NextResponse.json(
      { error: "Не удалось закрыть обращение. Попробуйте ещё раз." },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
