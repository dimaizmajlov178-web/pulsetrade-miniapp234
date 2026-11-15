import {
  adminAuditActionLabels,
  type AdminActor,
  type AdminAuditRecord,
  type AdminLimitsState,
  type AdminOperation,
  type AdminPromoCodeView,
  type AdminPromoState,
  type AdminUserDetail,
  type AdminUserSummary,
} from "@/lib/admin";
import { depositStatusLabels } from "@/lib/deposits";
import {
  getAccountByUid,
  getAllAccounts,
  getAllPromoCodes,
  getOrCreateAccount,
  getBonusActivations,
  getPromoCodeById,
  getPromoWageringPercent,
  getRecentDeposits,
  getRecentTrades,
  getRecentWithdrawals,
  adjustAccountBalancesWithAudit,
  createPromoCodeRecord,
  getAdminAuditRecords,
  putAdminAuditRecord,
  toPublicTrade,
  updatePromoCodeRecord,
  type AccountRecord,
  type PromoCodeRecord,
} from "@/lib/models";
import {
  bonusHistoryLimit,
  bonusStatusLabels,
  defaultPromoCodes,
  normalizePromoCode,
  promoCodeStatusLabels,
} from "@/lib/promo";
import {
  getPlatformLimits,
  savePlatformLimits,
  type PlatformLimits,
} from "@/lib/platform-settings";
import { formatUsdt, roundMoney } from "@/lib/trading";
import {
  withdrawalMethodLabels,
  withdrawalStatusLabels,
} from "@/lib/withdrawals";
import type {
  AdminBalanceAdjustmentInput,
  AdminLimitsInput,
  AdminPromoCreateInput,
  AdminPromoUpdateInput,
} from "@/lib/validation/admin";

export type AdminUsersState = {
  users: AdminUserSummary[];
};

export class AdminError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "ADMIN_ERROR") {
    super(message);
    this.name = "AdminError";
    this.status = status;
    this.code = code;
  }
}

function toUserSummary(account: AccountRecord): AdminUserSummary {
  return {
    id: account.id,
    uid: account.uid,
    demoBalance: roundMoney(account.demoBalance),
    realBalance: roundMoney(account.realBalance),
    totalBalance: roundMoney(account.demoBalance + account.realBalance),
    withdrawalReserved: roundMoney(account.withdrawalReserved ?? 0),
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

function formatDelta(value: number): string {
  return `${value > 0 ? "+" : ""}${formatUsdt(value)}`;
}

export function buildAdminAuditRecord(
  actor: AdminActor,
  input: Omit<AdminAuditRecord, "id" | "createdAt" | "staffRole" | "staffName">
): AdminAuditRecord {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    staffRole: actor.role,
    staffName: actor.name,
    ...input,
  };
}

async function appendAudit(record: AdminAuditRecord): Promise<void> {
  try {
    await putAdminAuditRecord(record);
  } catch (error) {
    console.error(
      "Не удалось записать действие в журнал:",
      error instanceof Error ? error.message : error
    );
  }
}

export async function getAdminUsersState(): Promise<AdminUsersState> {
  await getOrCreateAccount();
  const accounts = await getAllAccounts(100);

  return {
    users: accounts.map(toUserSummary),
  };
}

export async function getAdminUserDetail(
  uid: number
): Promise<AdminUserDetail> {
  const account = await getAccountByUid(uid);

  if (!account) {
    throw new AdminError(
      "Пользователь с таким UID не найден",
      404,
      "USER_NOT_FOUND"
    );
  }

  const [trades, deposits, withdrawals, bonuses] = await Promise.all([
    getRecentTrades(account.id, 50),
    getRecentDeposits(account.id, 50),
    getRecentWithdrawals(account.id, 50),
    getBonusActivations(account.id, bonusHistoryLimit),
  ]);

  const operations: AdminOperation[] = [
    ...deposits.map((deposit) => ({
      id: deposit.id,
      type: "deposit" as const,
      title: "Пополнение USDT (TON)",
      amount: roundMoney(deposit.amount),
      status: deposit.status,
      statusLabel: depositStatusLabels[deposit.status],
      createdAt: deposit.createdAt,
      details: deposit.txHash ? `Транзакция ${deposit.txHash}` : null,
    })),
    ...withdrawals.map((withdrawal) => ({
      id: withdrawal.id,
      type: "withdrawal" as const,
      title:
        withdrawal.type === "referral"
          ? `Вывод реферальных · ${withdrawalMethodLabels[withdrawal.method]}`
          : `Вывод ${withdrawalMethodLabels[withdrawal.method]}`,
      amount: roundMoney(withdrawal.amount),
      status: withdrawal.status,
      statusLabel: withdrawalStatusLabels[withdrawal.status],
      createdAt: withdrawal.createdAt,
      details: withdrawal.rejectionReason,
    })),
    ...bonuses.map((activation) => ({
      id: activation.id,
      type: "bonus" as const,
      title: `Бонус ${activation.code}`,
      amount: roundMoney(activation.bonusAmount),
      status: activation.status,
      statusLabel: bonusStatusLabels[activation.status],
      createdAt: activation.createdAt,
      details: `Отыграно ${formatUsdt(activation.wageredAmount)} из ${formatUsdt(
        activation.targetWagering
      )} USDT`,
    })),
  ].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)
  );

  return {
    user: toUserSummary(account),
    trades: trades.map(toPublicTrade),
    operations,
  };
}

export async function adjustUserBalances(
  uid: number,
  input: AdminBalanceAdjustmentInput,
  actor: AdminActor
): Promise<AdminUserDetail> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const account = await getAccountByUid(uid);

    if (!account) {
      throw new AdminError(
        "Пользователь с таким UID не найден",
        404,
        "USER_NOT_FOUND"
      );
    }

    const nextDemoBalance = roundMoney(account.demoBalance + input.demoDelta);
    const nextRealBalance = roundMoney(account.realBalance + input.realDelta);

    if (nextDemoBalance < 0 || nextRealBalance < 0) {
      throw new AdminError(
        "Баланс не может стать отрицательным",
        422,
        "NEGATIVE_BALANCE"
      );
    }

    if (
      nextDemoBalance === account.demoBalance &&
      nextRealBalance === account.realBalance
    ) {
      throw new AdminError("Баланс не изменился", 422, "NO_CHANGES");
    }

    const audit = buildAdminAuditRecord(actor, {
      action: "balance_adjustment",
      summary: `Демо ${formatDelta(input.demoDelta)}, реальные ${formatDelta(
        input.realDelta
      )} USDT. Причина: ${input.reason}`,
      targetType: "account",
      targetId: account.id,
      uid: account.uid,
      amount: roundMoney(input.demoDelta + input.realDelta),
      previousDemoBalance: account.demoBalance,
      previousRealBalance: account.realBalance,
      newDemoBalance: nextDemoBalance,
      newRealBalance: nextRealBalance,
    });

    const updated = await adjustAccountBalancesWithAudit(
      account,
      nextDemoBalance,
      nextRealBalance,
      audit
    );

    if (updated) {
      return getAdminUserDetail(updated.uid);
    }
  }

  throw new AdminError(
    "Не удалось изменить баланс. Обновите данные и попробуйте снова.",
    409,
    "BALANCE_CONFLICT"
  );
}

export async function getAdminLimitsState(): Promise<AdminLimitsState> {
  return { limits: await getPlatformLimits() };
}

export async function updateAdminLimits(
  input: AdminLimitsInput,
  actor: AdminActor
): Promise<AdminLimitsState> {
  const limits: PlatformLimits = {
    minStake: roundMoney(input.minStake),
    maxStake: roundMoney(input.maxStake),
    withdrawalMin: roundMoney(input.withdrawalMin),
    withdrawalMax: roundMoney(input.withdrawalMax),
  };
  const saved = await savePlatformLimits(limits);

  await appendAudit(
    buildAdminAuditRecord(actor, {
      action: "limits_updated",
      summary: `Ставки ${saved.minStake}–${saved.maxStake} USDT, вывод ${saved.withdrawalMin}–${saved.withdrawalMax} USDT`,
      targetType: "settings",
      targetId: "platform-limits",
    })
  );

  return { limits: saved };
}

function toPromoView(
  record: PromoCodeRecord,
  isDefault: boolean
): AdminPromoCodeView {
  return {
    id: record.id,
    code: record.id,
    bonusAmount: roundMoney(record.bonusAmount),
    status: record.status,
    isDefault,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function getAdminPromosState(): Promise<AdminPromoState> {
  const [stored, wageringPercent] = await Promise.all([
    getAllPromoCodes(),
    getPromoWageringPercent(),
  ]);
  const defaultCodes = new Set(defaultPromoCodes.map((promo) => promo.code));
  const storedCodes = new Set(stored.map((promo) => promo.id));
  const fallbackDate = "2024-01-01T00:00:00.000Z";

  const promos: AdminPromoCodeView[] = [
    ...stored.map((record) => toPromoView(record, defaultCodes.has(record.id))),
    ...defaultPromoCodes
      .filter((promo) => !storedCodes.has(promo.code))
      .map((promo) => ({
        id: promo.code,
        code: promo.code,
        bonusAmount: roundMoney(promo.bonusAmount),
        status: "active" as const,
        isDefault: true,
        createdAt: fallbackDate,
        updatedAt: fallbackDate,
      })),
  ];

  return { promos, wageringPercent };
}

export async function createAdminPromo(
  input: AdminPromoCreateInput,
  actor: AdminActor
): Promise<AdminPromoState> {
  const code = normalizePromoCode(input.code);
  const existing = await getPromoCodeById(code);

  if (existing || defaultPromoCodes.some((promo) => promo.code === code)) {
    throw new AdminError("Промокод уже существует", 409, "PROMO_EXISTS");
  }

  const now = new Date().toISOString();
  const record: PromoCodeRecord = {
    id: code,
    bonusAmount: roundMoney(input.bonusAmount),
    status: input.status,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await createPromoCodeRecord(record);
  } catch {
    throw new AdminError("Промокод уже существует", 409, "PROMO_EXISTS");
  }

  await appendAudit(
    buildAdminAuditRecord(actor, {
      action: "promo_created",
      summary: `Создан ${code} на ${formatUsdt(record.bonusAmount)} USDT (${promoCodeStatusLabels[record.status]})`,
      targetType: "promo",
      targetId: code,
      amount: record.bonusAmount,
    })
  );

  return getAdminPromosState();
}

export async function updateAdminPromo(
  id: string,
  input: AdminPromoUpdateInput,
  actor: AdminActor
): Promise<AdminPromoState> {
  const code = normalizePromoCode(id);
  const stored = await getPromoCodeById(code);
  const fallback = defaultPromoCodes.find((promo) => promo.code === code);

  if (!stored && !fallback) {
    throw new AdminError("Промокод не найден", 404, "PROMO_NOT_FOUND");
  }

  const now = new Date().toISOString();

  if (stored) {
    const updated = await updatePromoCodeRecord(code, {
      bonusAmount: roundMoney(input.bonusAmount),
      status: input.status,
    });

    if (!updated) {
      throw new AdminError("Промокод не найден", 404, "PROMO_NOT_FOUND");
    }
  } else if (fallback) {
    await createPromoCodeRecord({
      id: code,
      bonusAmount: roundMoney(input.bonusAmount),
      status: input.status,
      createdAt: now,
      updatedAt: now,
    });
  }

  await appendAudit(
    buildAdminAuditRecord(actor, {
      action: "promo_updated",
      summary: `${code}: бонус ${formatUsdt(input.bonusAmount)} USDT, ${promoCodeStatusLabels[input.status]}`,
      targetType: "promo",
      targetId: code,
      amount: roundMoney(input.bonusAmount),
    })
  );

  return getAdminPromosState();
}

export async function getAdminAuditState(): Promise<{
  entries: AdminAuditRecord[];
}> {
  const entries = await getAdminAuditRecords(200);

  return { entries };
}

export function describeAuditAction(record: AdminAuditRecord): string {
  return adminAuditActionLabels[record.action];
}
