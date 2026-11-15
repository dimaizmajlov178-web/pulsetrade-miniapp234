export const depositStatuses = [
  "pending",
  "completed",
  "expired",
  "failed",
] as const;

export type DepositStatus = (typeof depositStatuses)[number];

export const depositStatusLabels: Record<DepositStatus, string> = {
  pending: "Ожидает",
  completed: "Зачислено",
  expired: "Истёк",
  failed: "Ошибка",
};

export const depositAmounts = [50, 100, 250, 500] as const;

export const depositLimits = {
  min: 10,
  max: 10_000,
} as const;

export const depositExpiryMinutes = 30;

export const depositHistoryLimit = 50;

export type DepositCurrency = "USDT";
export type DepositNetwork = "TON";

export type DepositLimits = {
  minAmount: number;
  maxAmount: number;
  presets: number[];
};

export type PublicDeposit = {
  id: string;
  amount: number;
  currency: DepositCurrency;
  network: DepositNetwork;
  status: DepositStatus;
  address: string | null;
  memo: string | null;
  paymentLink: string;
  createdAt: string;
  expiresAt: string;
  confirmedAt: string | null;
};

export const depositLimitsConfig: DepositLimits = {
  minAmount: depositLimits.min,
  maxAmount: depositLimits.max,
  presets: [...depositAmounts],
};
