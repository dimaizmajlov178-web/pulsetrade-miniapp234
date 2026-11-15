import {
  activateBonusWithCredit,
  DEFAULT_ACCOUNT_ID,
  getBonusActivationById,
  getBonusActivations,
  getOrCreateAccount,
  getPromoCodeById,
  getPromoWageringPercent,
  toPublicAccount,
  toPublicBonusActivation,
  type BonusActivationRecord,
} from "@/lib/models";
import {
  bonusHistoryLimit,
  defaultPromoCodes,
  normalizePromoCode,
  type PublicBonusActivation,
} from "@/lib/promo";
import { roundMoney, type PublicAccount } from "@/lib/trading";
import type { ActivatePromoInput } from "@/lib/validation/promo";

export type PromoState = {
  account: PublicAccount;
  activations: PublicBonusActivation[];
  wageringPercent: number;
};

export type PromoActivationResult = {
  account: PublicAccount;
  activation: PublicBonusActivation;
  activations: PublicBonusActivation[];
  wageringPercent: number;
};

export class PromoError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "PROMO_ERROR") {
    super(message);
    this.name = "PromoError";
    this.status = status;
    this.code = code;
  }
}

async function resolveBonusAmount(code: string): Promise<number | null> {
  const stored = await getPromoCodeById(code);

  if (stored) {
    if (stored.status === "disabled") {
      return null;
    }

    const amount = roundMoney(Number(stored.bonusAmount));

    return Number.isFinite(amount) && amount > 0 ? amount : null;
  }

  const fallback = defaultPromoCodes.find((promo) => promo.code === code);

  return fallback ? roundMoney(fallback.bonusAmount) : null;
}

export async function getPromoState(
  accountId: string = DEFAULT_ACCOUNT_ID
): Promise<PromoState> {
  const [account, activations, wageringPercent] = await Promise.all([
    getOrCreateAccount(accountId),
    getBonusActivations(accountId, bonusHistoryLimit),
    getPromoWageringPercent(),
  ]);

  return {
    account: toPublicAccount(account),
    activations: activations.map(toPublicBonusActivation),
    wageringPercent,
  };
}

export async function activatePromoCode(
  input: ActivatePromoInput
): Promise<PromoActivationResult> {
  const code = normalizePromoCode(input.code);
  const bonusAmount = await resolveBonusAmount(code);

  if (bonusAmount === null) {
    throw new PromoError("Промокод недействителен", 404, "INVALID_CODE");
  }

  const account = await getOrCreateAccount();
  const activationId = `${account.id}__${code}`;
  const existing = await getBonusActivationById(activationId);

  if (existing) {
    throw new PromoError("Этот промокод уже использован", 409, "ALREADY_USED");
  }

  const wageringPercent = await getPromoWageringPercent();
  const targetWagering = roundMoney((bonusAmount * wageringPercent) / 100);
  const now = new Date().toISOString();
  const activation: BonusActivationRecord = {
    id: activationId,
    accountId: account.id,
    uid: account.uid,
    code,
    bonusAmount,
    wageringPercent,
    wageredAmount: 0,
    targetWagering,
    status: "active",
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };

  const updatedAccount = await activateBonusWithCredit(account, activation);

  if (!updatedAccount) {
    const current = await getBonusActivationById(activationId);

    if (current) {
      throw new PromoError(
        "Этот промокод уже использован",
        409,
        "ALREADY_USED"
      );
    }

    throw new PromoError(
      "Не удалось активировать промокод. Попробуйте ещё раз.",
      409,
      "PROMO_CONFLICT"
    );
  }

  const activations = await getBonusActivations(account.id, bonusHistoryLimit);

  return {
    account: toPublicAccount(updatedAccount),
    activation: toPublicBonusActivation(activation),
    activations: activations.map(toPublicBonusActivation),
    wageringPercent,
  };
}
