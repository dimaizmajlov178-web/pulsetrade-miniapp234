export const marketPairIds = ["btc", "eth", "sol"] as const;

export type MarketPairId = (typeof marketPairIds)[number];

export type MarketPair = {
  id: MarketPairId;
  base: string;
  symbol: string;
};

export const marketPairs: MarketPair[] = [
  { id: "btc", base: "BTC", symbol: "BTCUSDT" },
  { id: "eth", base: "ETH", symbol: "ETHUSDT" },
  { id: "sol", base: "SOL", symbol: "SOLUSDT" },
];

export const marketTimeframeIds = [
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "4h",
] as const;

export type MarketTimeframeId = (typeof marketTimeframeIds)[number];

export const marketTimeframeLabels: Record<MarketTimeframeId, string> = {
  "1m": "1м",
  "3m": "3м",
  "5m": "5м",
  "15m": "15м",
  "30m": "30м",
  "1h": "1ч",
  "4h": "4ч",
};

export const defaultMarketTimeframe: MarketTimeframeId = "1m";

export function isMarketTimeframeId(
  value: unknown
): value is MarketTimeframeId {
  return (
    typeof value === "string" &&
    (marketTimeframeIds as readonly string[]).includes(value)
  );
}

export type MarketCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type MarketSnapshot = {
  pairId: MarketPairId;
  symbol: string;
  timeframe: MarketTimeframeId;
  price: number;
  change: number;
  high: number;
  low: number;
  series: number[];
  candles: MarketCandle[];
  updatedAt: number;
};

export function getMarketPair(pairId: string): MarketPair | undefined {
  return marketPairs.find((pair) => pair.id === pairId);
}
