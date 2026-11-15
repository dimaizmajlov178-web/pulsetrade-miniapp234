import { z } from "zod";

import {
  defaultMarketTimeframe,
  type MarketPair,
  type MarketSnapshot,
  type MarketTimeframeId,
} from "@/lib/market-data";

const BINANCE_HOSTS = [
  "https://data-api.binance.vision",
  "https://api.binance.com",
  "https://api1.binance.com",
];

const REQUEST_TIMEOUT_MS = 4_000;
const KLINE_HISTORY_LIMIT = 500;

const klineSchema = z
  .array(z.union([z.string(), z.number()]))
  .min(5)
  .transform((row) => ({
    time: Math.floor(Number(row[0]) / 1000),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
  }));

const klinesSchema = z.array(klineSchema).min(2);

const tickerSchema = z.object({
  lastPrice: z.coerce.number().positive(),
  priceChangePercent: z.coerce.number(),
  highPrice: z.coerce.number().positive(),
  lowPrice: z.coerce.number().positive(),
});

async function fetchBinanceJson(path: string): Promise<unknown> {
  let lastError: unknown = new Error("Источник котировок недоступен");

  for (const host of BINANCE_HOSTS) {
    try {
      const response = await fetch(`${host}${path}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        lastError = new Error(`Binance вернул ${response.status}`);
        continue;
      }

      return (await response.json()) as unknown;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Источник котировок недоступен");
}

export async function fetchMarketSnapshot(
  pair: MarketPair,
  timeframe: MarketTimeframeId = defaultMarketTimeframe
): Promise<MarketSnapshot> {
  const [klinesResult, tickerResult] = await Promise.allSettled([
    fetchBinanceJson(
      `/api/v3/klines?symbol=${pair.symbol}&interval=${timeframe}&limit=${KLINE_HISTORY_LIMIT}`
    ),
    fetchBinanceJson(`/api/v3/ticker/24hr?symbol=${pair.symbol}`),
  ]);

  if (klinesResult.status === "rejected") {
    throw klinesResult.reason instanceof Error
      ? klinesResult.reason
      : new Error("Источник котировок недоступен");
  }

  const klines = klinesSchema.parse(klinesResult.value);
  const candles = klines.filter(
    (kline) =>
      Number.isFinite(kline.time) &&
      kline.time > 0 &&
      Number.isFinite(kline.open) &&
      kline.open > 0 &&
      Number.isFinite(kline.high) &&
      kline.high > 0 &&
      Number.isFinite(kline.low) &&
      kline.low > 0 &&
      Number.isFinite(kline.close) &&
      kline.close > 0 &&
      kline.high >= kline.low
  );

  if (candles.length < 2) {
    throw new Error("Источник вернул пустой ряд цен");
  }

  const series = candles.map((candle) => candle.close);
  const price = series[series.length - 1];
  const fallbackHigh = Math.max(...candles.map((candle) => candle.high));
  const fallbackLow = Math.min(...candles.map((candle) => candle.low));
  const fallbackChange = ((price - series[0]) / series[0]) * 100;

  let change = fallbackChange;
  let high = fallbackHigh;
  let low = fallbackLow;

  if (tickerResult.status === "fulfilled") {
    const parsedTicker = tickerSchema.safeParse(tickerResult.value);
    if (parsedTicker.success) {
      change = parsedTicker.data.priceChangePercent;
      high = parsedTicker.data.highPrice;
      low = parsedTicker.data.lowPrice;
    }
  }

  return {
    pairId: pair.id,
    symbol: pair.symbol,
    timeframe,
    price,
    change,
    high,
    low,
    series,
    candles,
    updatedAt: Date.now(),
  };
}
