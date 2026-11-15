import type { PublicWithdrawal } from "@/lib/withdrawals";

export const REFERRAL_CODE_PREFIX = "INF_";
export const REFERRAL_MIN_WITHDRAWAL = 10;
export const DEFAULT_REFERRAL_PERCENT = 0;

export type ReferralState = {
  uid: number;
  link: string;
  rewardPercent: number;
  balance: number;
  availableBalance: number;
  referralsCount: number;
  isInfluencer: boolean;
  minWithdrawal: number;
  withdrawals: PublicWithdrawal[];
};

export function normalizeReferralPercent(value: unknown): number {
  const percent = Number(value);

  if (!Number.isFinite(percent) || percent <= 0) {
    return DEFAULT_REFERRAL_PERCENT;
  }

  return Math.min(100, Math.round(percent * 100) / 100);
}

export function parseReferralCode(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = new RegExp(`^${REFERRAL_CODE_PREFIX}(\\d{1,12})$`, "i").exec(
    value.trim()
  );

  if (!match) {
    return null;
  }

  const uid = Number(match[1]);

  return Number.isInteger(uid) && uid > 0 ? uid : null;
}

export function getReferralBotUsername(): string {
  return (
    process.env.TELEGRAM_BOT_USERNAME?.trim() ||
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim() ||
    "YourBot"
  );
}

export function buildReferralLink(uid: number): string {
  return `https://t.me/${getReferralBotUsername()}?startapp=${REFERRAL_CODE_PREFIX}${uid}`;
}
