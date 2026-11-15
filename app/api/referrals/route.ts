import { NextResponse } from "next/server";

import { isDatabaseAvailable } from "@/lib/db";
import { mockReferralState } from "@/lib/mock-data";
import { getReferralState } from "@/lib/referral-service";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET() {
  if (!(await isDatabaseAvailable())) {
    return NextResponse.json(
      { referral: mockReferralState },
      { headers: noStoreHeaders }
    );
  }

  try {
    return NextResponse.json(
      { referral: await getReferralState() },
      { headers: noStoreHeaders }
    );
  } catch (error) {
    console.error("Не удалось загрузить реферальные данные:", error);

    return NextResponse.json(
      { error: "Не удалось загрузить реферальные данные" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
