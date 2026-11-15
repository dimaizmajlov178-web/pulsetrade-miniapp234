export const bonusStatuses = ["active", "completed"] as const;

export type BonusStatus = (typeof bonusStatuses)[number];

export const bonusStatusLabels: Record<BonusStatus, string> = {
  active: "В отыгрыше",
  completed: "Отыгран",
};

export const promoCodeStatuses = ["active", "disabled"] as const;

export type PromoCodeStatus = (typeof promoCodeStatuses)[number];

export const promoCodeStatusLabels: Record<PromoCodeStatus, string> = {
  active: "Активен",
  disabled: "Отключён",
};

export const DEFAULT_WAGERING_PERCENT = 100;

export const bonusHistoryLimit = 50;

export const promoCodeLimits = {
  minLength: 3,
  maxLength: 32,
} as const;

export type PromoCodeDefinition = {
  code: string;
  bonusAmount: number;
};

export const defaultPromoCodes: PromoCodeDefinition[] = [
  { code: "WELCOME", bonusAmount: 50 },
  { code: "PULSE100", bonusAmount: 100 },
];

export type PublicBonusActivation = {
  id: string;
  code: string;
  bonusAmount: number;
  wageringPercent: number;
  wageredAmount: number;
  requiredWagering: number;
  progressPercent: number;
  status: BonusStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export function normalizePromoCode(raw: string): string {
  return raw.trim().toUpperCase();
}
