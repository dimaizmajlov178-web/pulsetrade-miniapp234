import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { fetchMarketSnapshot } from "@/lib/binance";
import {
  defaultMarketTimeframe,
  getMarketPair,
  marketPairIds,
  marketTimeframeIds,
} from "@/lib/market-data";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  pair: z.enum(marketPairIds),
  timeframe: z.enum(marketTimeframeIds).default(defaultMarketTimeframe),
});

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse({
    pair: request.nextUrl.searchParams.get("pair") ?? undefined,
    timeframe: request.nextUrl.searchParams.get("timeframe") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Неизвестная торговая пара" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const pair = getMarketPair(parsed.data.pair);

  if (!pair) {
    return NextResponse.json(
      { error: "Неизвестная торговая пара" },
      { status: 404, headers: noStoreHeaders }
    );
  }

  try {
    const snapshot = await fetchMarketSnapshot(pair, parsed.data.timeframe);
    return NextResponse.json(snapshot, { headers: noStoreHeaders });
  } catch {
    return NextResponse.json(
      { error: "Источник котировок временно недоступен" },
      { status: 502, headers: noStoreHeaders }
    );
  }
}
