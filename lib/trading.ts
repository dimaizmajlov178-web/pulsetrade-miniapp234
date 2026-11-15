import type { MarketPairId } from "@/lib/market-data";

export const tradeDirections = ["up", "down"] as const;

export type TradeDirection = (typeof tradeDirections)[number];

export const tradeDirectionLabels: Record<TradeDirection, string> = {
  up: "Вверх",
  down: "Вниз",
};

export const expiryOptions = [
  { label: "1 мин", minutes: 1 },
  { label: "3 мин", minutes: 3 },
  { label: "5 мин", minutes: 5 },
  { label: "15 мин", minutes: 15 },
] as const;

export const payoutRate = 82;

export const stakeLimits = {
  min: 1,
  max: 1000,
} as const;

export const minExpiryMinutes = expiryOptions[0].minutes;
export const maxExpiryMinutes = expiryOptions[expiryOptions.length - 1].minutes;

export const tradeHistoryLimit = 100;

export const maxActiveTrades = 10;

export type TradeStatus = "open" | "won" | "lost";

export type PublicAccount = {
  uid: number;
  balance: number;
  updatedAt: string;
};

export type PublicTrade = {
  id: string;
  pairId: MarketPairId;
  symbol: string;
  direction: TradeDirection;
  stake: number;
  expiryMinutes: number;
  entryPrice: number;
  exitPrice: number | null;
  status: TradeStatus;
  profit: number;
  payout: number;
  payoutRate: number;
  createdAt: string;
  expiresAt: string;
  resolvedAt: string | null;
};

export type TradingLimits = {
  minStake: number;
  maxStake: number;
  payoutRate: number;
  minExpiryMinutes: number;
  maxExpiryMinutes: number;
};

export const tradingLimits: TradingLimits = {
  minStake: stakeLimits.min,
  maxStake: stakeLimits.max,
  payoutRate,
  minExpiryMinutes,
  maxExpiryMinutes,
};

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatUsdt(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function calculateProfit(stake: number, rate = payoutRate): number {
  return roundMoney((stake * rate) / 100);
}

export function resolveTradeStatus(
  direction: TradeDirection,
  entryPrice: number,
  exitPrice: number
): TradeStatus {
  if (direction === "up") {
    return exitPrice >= entryPrice ? "won" : "lost";
  }

  return exitPrice < entryPrice ? "won" : "lost";
}
