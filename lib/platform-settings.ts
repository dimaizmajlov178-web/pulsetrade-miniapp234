import { getPlatformSettingsRecord, putPlatformSettingsRecord } from "@/lib/models";
import {
  tradingLimits,
  type TradingLimits,
} from "@/lib/trading";
import {
  withdrawalAmounts,
  withdrawalLimits,
  type WithdrawalLimits,
} from "@/lib/withdrawals";

export type PlatformLimits = {
  minStake: number;
  maxStake: number;
  withdrawalMin: number;
  withdrawalMax: number;
};

export const DEFAULT_PLATFORM_LIMITS: PlatformLimits = {
  minStake: tradingLimits.minStake,
  maxStake: tradingLimits.maxStake,
  withdrawalMin: withdrawalLimits.min,
  withdrawalMax: withdrawalLimits.max,
};

function normalizeLimit(value: unknown, fallback: number): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizePlatformLimits(value: {
  minStake?: unknown;
  maxStake?: unknown;
  withdrawalMin?: unknown;
  withdrawalMax?: unknown;
}): PlatformLimits {
  const minStake = normalizeLimit(value.minStake, DEFAULT_PLATFORM_LIMITS.minStake);
  const maxStake = normalizeLimit(value.maxStake, DEFAULT_PLATFORM_LIMITS.maxStake);
  const withdrawalMin = normalizeLimit(
    value.withdrawalMin,
    DEFAULT_PLATFORM_LIMITS.withdrawalMin
  );
  const withdrawalMax = normalizeLimit(
    value.withdrawalMax,
    DEFAULT_PLATFORM_LIMITS.withdrawalMax
  );

  return {
    minStake: minStake < maxStake ? minStake : DEFAULT_PLATFORM_LIMITS.minStake,
    maxStake: minStake < maxStake ? maxStake : DEFAULT_PLATFORM_LIMITS.maxStake,
    withdrawalMin:
      withdrawalMin < withdrawalMax
        ? withdrawalMin
        : DEFAULT_PLATFORM_LIMITS.withdrawalMin,
    withdrawalMax:
      withdrawalMin < withdrawalMax
        ? withdrawalMax
        : DEFAULT_PLATFORM_LIMITS.withdrawalMax,
  };
}

export async function getPlatformLimits(): Promise<PlatformLimits> {
  try {
    const record = await getPlatformSettingsRecord();

    if (!record) {
      return DEFAULT_PLATFORM_LIMITS;
    }

    return normalizePlatformLimits(record);
  } catch (error) {
    console.warn(
      "Не удалось прочитать лимиты платформы:",
      error instanceof Error ? error.message : error
    );

    return DEFAULT_PLATFORM_LIMITS;
  }
}

export async function savePlatformLimits(
  limits: PlatformLimits
): Promise<PlatformLimits> {
  const normalized = normalizePlatformLimits(limits);

  await putPlatformSettingsRecord(normalized);

  return normalized;
}

export function buildTradingLimits(limits: PlatformLimits): TradingLimits {
  return {
    ...tradingLimits,
    minStake: limits.minStake,
    maxStake: limits.maxStake,
  };
}

export function buildWithdrawalLimits(
  limits: PlatformLimits
): WithdrawalLimits {
  const presets = withdrawalAmounts.filter(
    (amount) =>
      amount >= limits.withdrawalMin && amount <= limits.withdrawalMax
  );

  return {
    minAmount: limits.withdrawalMin,
    maxAmount: limits.withdrawalMax,
    presets:
      presets.length > 0
        ? [...presets]
        : [Math.round(limits.withdrawalMin)],
  };
}
