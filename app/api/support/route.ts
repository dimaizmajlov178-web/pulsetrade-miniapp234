import { NextResponse, type NextRequest } from "next/server";

import { isDatabaseAvailable } from "@/lib/db";
import { mockSupportTickets } from "@/lib/mock-data";
import {
  getSupportState,
  sendSupportMessage,
  SupportError,
} from "@/lib/support-service";
import { supportMessageSchema } from "@/lib/validation/support";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET() {
  if (!(await isDatabaseAvailable())) {
    return NextResponse.json(
      { tickets: mockSupportTickets },
      { headers: noStoreHeaders }
    );
  }

  try {
    return NextResponse.json(await getSupportState(), {
      headers: noStoreHeaders,
    });
  } catch (error) {
    console.error("Не удалось загрузить обращения поддержки:", error);

    return NextResponse.json(
      { error: "Не удалось загрузить историю переписки" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await isDatabaseAvailable())) {
    return NextResponse.json(
      { error: "Чат поддержки временно недоступен. Попробуйте позже." },
      { status: 503, headers: noStoreHeaders }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Некорректные данные сообщения" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const parsed = supportMessageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Проверьте сообщение",
        details: parsed.error.flatten(),
      },
      { status: 400, headers: noStoreHeaders }
    );
  }

  try {
    return NextResponse.json(await sendSupportMessage(parsed.data), {
      status: 201,
      headers: noStoreHeaders,
    });
  } catch (error) {
    if (error instanceof SupportError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status, headers: noStoreHeaders }
      );
    }

    console.error("Не удалось отправить сообщение в поддержку:", error);

    return NextResponse.json(
      { error: "Не удалось отправить сообщение. Попробуйте ещё раз." },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
