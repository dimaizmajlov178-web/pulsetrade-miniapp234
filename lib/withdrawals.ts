export const withdrawalMethods = ["usdt", "sbp"] as const;

export type WithdrawalMethod = (typeof withdrawalMethods)[number];

export const withdrawalMethodLabels: Record<WithdrawalMethod, string> = {
  usdt: "USDT",
  sbp: "СБП",
};

export const withdrawalTypes = ["balance", "referral"] as const;

export type WithdrawalType = (typeof withdrawalTypes)[number];

export const withdrawalTypeLabels: Record<WithdrawalType, string> = {
  balance: "Основной баланс",
  referral: "Реферальные",
};

export const withdrawalStatuses = ["pending", "paid", "rejected"] as const;

export type WithdrawalStatus = (typeof withdrawalStatuses)[number];

export const withdrawalStatusLabels: Record<WithdrawalStatus, string> = {
  pending: "На обработке",
  paid: "Выплачено",
  rejected: "Отклонено",
};

export const withdrawalAmounts = [100, 250, 500, 1000] as const;

export const withdrawalLimits = {
  min: 50,
  max: 5_000,
} as const;

export const withdrawalHistoryLimit = 50;

export const adminWithdrawalsLimit = 200;

export type WithdrawalLimits = {
  minAmount: number;
  maxAmount: number;
  presets: number[];
};

export type PublicWithdrawal = {
  id: string;
  amount: number;
  method: WithdrawalMethod;
  type: WithdrawalType;
  status: WithdrawalStatus;
  address: string | null;
  phone: string | null;
  recipient: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
};

export type AdminWithdrawal = PublicWithdrawal & {
  uid: number;
};

export const withdrawalLimitsConfig: WithdrawalLimits = {
  minAmount: withdrawalLimits.min,
  maxAmount: withdrawalLimits.max,
  presets: [...withdrawalAmounts],
};
