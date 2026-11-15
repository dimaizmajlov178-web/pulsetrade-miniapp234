import {
  createWithdrawalWithReservation,
  DEFAULT_ACCOUNT_ID,
  getAccountById,
  getAllWithdrawals,
  getOrCreateAccount,
  getRecentWithdrawals,
  getWithdrawalById,
  settleWithdrawalRecord,
  toAdminWithdrawal,
  toPublicAccount,
  toPublicWithdrawal,
  type AccountRecord,
  type WithdrawalRecord,
} from "@/lib/models";
import { formatUsdt, roundMoney, type PublicAccount } from "@/lib/trading";
import { createAdminActor, type AdminActor } from "@/lib/admin";
import { buildAdminAuditRecord } from "@/lib/admin-service";
import {
  buildWithdrawalLimits,
  getPlatformLimits,
} from "@/lib/platform-settings";
import type { CreateWithdrawalInput } from "@/lib/validation/withdrawal";
import {
  adminWithdrawalsLimit,
  withdrawalHistoryLimit,
  withdrawalMethodLabels,
  type AdminWithdrawal,
  type PublicWithdrawal,
  type WithdrawalLimits,
} from "@/lib/withdrawals";

export type WithdrawalsState = {
  account: PublicAccount;
  withdrawals: PublicWithdrawal[];
  limits: WithdrawalLimits;
  availableBalance: number;
};

export type AdminWithdrawalsState = {
  withdrawals: AdminWithdrawal[];
};

export type WithdrawalState = {
  account: PublicAccount;
  withdrawal: PublicWithdrawal;
  limits: WithdrawalLimits;
  availableBalance: number;
};

export class WithdrawalError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "WITHDRAWAL_ERROR") {
    super(message);
    this.name = "WithdrawalError";
    this.status = status;
    this.code = code;
  }
}

function getAvailableBalance(account: AccountRecord): number {
  const balance = roundMoney(account.demoBalance + account.realBalance);
  const reserved = roundMoney(account.withdrawalReserved ?? 0);

  return roundMoney(balance - reserved);
}

function buildState(
  withdrawal: WithdrawalRecord,
  account: AccountRecord,
  limits: WithdrawalLimits
): WithdrawalState {
  return {
    account: toPublicAccount(account),
    withdrawal: toPublicWithdrawal(withdrawal),
    limits,
    availableBalance: getAvailableBalance(account),
  };
}

function buildRecord(
  input: CreateWithdrawalInput,
  account: AccountRecord,
  id: string,
  createdAt: string
): WithdrawalRecord {
  return {
    id,
    accountId: account.id,
    uid: account.uid,
    amount: roundMoney(input.amount),
    method: input.method,
    type: "balance",
    status: "pending",
    address: input.method === "usdt" ? input.address : null,
    phone: input.method === "sbp" ? input.phone : null,
    recipient: input.method === "sbp" ? input.recipient : null,
    rejectionReason: null,
    createdAt,
    updatedAt: createdAt,
    processedAt: null,
  };
}

export async function getWithdrawalsState(
  accountId: string = DEFAULT_ACCOUNT_ID
): Promise<WithdrawalsState> {
  const [account, withdrawals, platformLimits] = await Promise.all([
    getOrCreateAccount(accountId),
    getRecentWithdrawals(accountId, withdrawalHistoryLimit),
    getPlatformLimits(),
  ]);

  return {
    account: toPublicAccount(account),
    withdrawals: withdrawals
      .filter((withdrawal) => (withdrawal.type ?? "balance") === "balance")
      .map(toPublicWithdrawal),
    limits: buildWithdrawalLimits(platformLimits),
    availableBalance: getAvailableBalance(account),
  };
}

export async function getAdminWithdrawalsState(): Promise<AdminWithdrawalsState> {
  const withdrawals = await getAllWithdrawals(adminWithdrawalsLimit);

  return {
    withdrawals: withdrawals.map(toAdminWithdrawal),
  };
}

export async function getWithdrawalState(id: string): Promise<WithdrawalState> {
  const withdrawal = await getWithdrawalById(id);

  if (!withdrawal) {
    throw new WithdrawalError("Заявка не найдена", 404, "NOT_FOUND");
  }

  const [account, platformLimits] = await Promise.all([
    getAccountById(withdrawal.accountId),
    getPlatformLimits(),
  ]);

  if (!account) {
    throw new WithdrawalError("Счёт не найден", 404, "NO_ACCOUNT");
  }

  return buildState(withdrawal, account, buildWithdrawalLimits(platformLimits));
}

export async function createWithdrawal(
  input: CreateWithdrawalInput
): Promise<WithdrawalState> {
  const amount = roundMoney(input.amount);
  const limits = buildWithdrawalLimits(await getPlatformLimits());

  if (amount < limits.minAmount) {
    throw new WithdrawalError(
      `Минимальная сумма вывода — ${limits.minAmount} USDT`,
      422,
      "MIN_AMOUNT"
    );
  }

  if (amount > limits.maxAmount) {
    throw new WithdrawalError(
      `Максимальная сумма вывода — ${limits.maxAmount} USDT`,
      422,
      "MAX_AMOUNT"
    );
  }

  const withdrawalId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const account = await getOrCreateAccount();
    const availableBalance = getAvailableBalance(account);

    if (amount > availableBalance + 0.001) {
      throw new WithdrawalError(
        `Недостаточно средств: доступно ${formatUsdt(availableBalance)} USDT`,
        422,
        "INSUFFICIENT_BALANCE"
      );
    }

    const withdrawal = buildRecord(input, account, withdrawalId, createdAt);
    const updatedAccount = await createWithdrawalWithReservation(
      account,
      withdrawal
    );

    if (updatedAccount) {
      return buildState(withdrawal, updatedAccount, limits);
    }
  }

  const existing = await getWithdrawalById(withdrawalId);

  if (existing) {
    const account = await getAccountById(existing.accountId);

    if (account) {
      return buildState(existing, account, limits);
    }
  }

  throw new WithdrawalError(
    "Не удалось создать заявку на вывод. Попробуйте ещё раз.",
    409,
    "WITHDRAWAL_CONFLICT"
  );
}

export async function markWithdrawalPaid(
  id: string,
  actor: AdminActor = createAdminActor("owner")
): Promise<WithdrawalState> {
  const withdrawal = await getWithdrawalById(id);

  if (!withdrawal) {
    throw new WithdrawalError("Заявка не найдена", 404, "NOT_FOUND");
  }

  if (withdrawal.status === "paid") {
    const account = await getAccountById(withdrawal.accountId);

    if (!account) {
      throw new WithdrawalError("Счёт не найден", 404, "NO_ACCOUNT");
    }

    return buildState(
      withdrawal,
      account,
      buildWithdrawalLimits(await getPlatformLimits())
    );
  }

  if (withdrawal.status !== "pending") {
    throw new WithdrawalError(
      "Отклонённую заявку нельзя выплатить",
      409,
      "INVALID_STATUS"
    );
  }

  const settled = await settleWithdrawalRecord(
    withdrawal,
    {
      status: "paid",
    },
    buildAdminAuditRecord(actor, {
      action: "withdrawal_paid",
      summary: `Заявка ${withdrawal.id} · вывод ${
        withdrawalMethodLabels[withdrawal.method]
      } · ${formatUsdt(withdrawal.amount)} USDT выплачена`,
      targetType: "withdrawal",
      targetId: withdrawal.id,
      uid: withdrawal.uid,
      amount: withdrawal.amount,
    })
  );

  if (!settled) {
    const current = await getWithdrawalById(id);

    if (current?.status === "paid") {
      const [account, platformLimits] = await Promise.all([
        getAccountById(current.accountId),
        getPlatformLimits(),
      ]);

      if (account) {
        return buildState(
          current,
          account,
          buildWithdrawalLimits(platformLimits)
        );
      }
    }

    throw new WithdrawalError(
      "Не удалось выплатить заявку. Проверьте доступный баланс.",
      409,
      "PAYMENT_CONFLICT"
    );
  }

  const [account, platformLimits] = await Promise.all([
    getAccountById(settled.accountId),
    getPlatformLimits(),
  ]);

  if (!account) {
    throw new WithdrawalError("Счёт не найден", 404, "NO_ACCOUNT");
  }

  return buildState(settled, account, buildWithdrawalLimits(platformLimits));
}

export async function markWithdrawalRejected(
  id: string,
  reason: string,
  actor: AdminActor = createAdminActor("owner")
): Promise<WithdrawalState> {
  const normalizedReason = reason.trim();

  if (normalizedReason.length < 2) {
    throw new WithdrawalError(
      "Укажите причину отклонения",
      422,
      "REASON_REQUIRED"
    );
  }

  const withdrawal = await getWithdrawalById(id);

  if (!withdrawal) {
    throw new WithdrawalError("Заявка не найдена", 404, "NOT_FOUND");
  }

  if (withdrawal.status === "rejected") {
    const [account, platformLimits] = await Promise.all([
      getAccountById(withdrawal.accountId),
      getPlatformLimits(),
    ]);

    if (!account) {
      throw new WithdrawalError("Счёт не найден", 404, "NO_ACCOUNT");
    }

    return buildState(
      withdrawal,
      account,
      buildWithdrawalLimits(platformLimits)
    );
  }

  if (withdrawal.status !== "pending") {
    throw new WithdrawalError(
      "Выплаченную заявку нельзя отклонить",
      409,
      "INVALID_STATUS"
    );
  }

  const settled = await settleWithdrawalRecord(
    withdrawal,
    {
      status: "rejected",
      reason: normalizedReason,
    },
    buildAdminAuditRecord(actor, {
      action: "withdrawal_rejected",
      summary: `Заявка ${withdrawal.id} · вывод ${
        withdrawalMethodLabels[withdrawal.method]
      } · ${formatUsdt(withdrawal.amount)} USDT отклонена. Причина: ${normalizedReason}`,
      targetType: "withdrawal",
      targetId: withdrawal.id,
      uid: withdrawal.uid,
      amount: withdrawal.amount,
    })
  );

  if (!settled) {
    const current = await getWithdrawalById(id);

    if (current?.status === "rejected") {
      const [account, platformLimits] = await Promise.all([
        getAccountById(current.accountId),
        getPlatformLimits(),
      ]);

      if (account) {
        return buildState(
          current,
          account,
          buildWithdrawalLimits(platformLimits)
        );
      }
    }

    throw new WithdrawalError(
      "Не удалось отклонить заявку. Попробуйте ещё раз.",
      409,
      "REJECT_CONFLICT"
    );
  }

  const [account, platformLimits] = await Promise.all([
    getAccountById(settled.accountId),
    getPlatformLimits(),
  ]);

  if (!account) {
    throw new WithdrawalError("Счёт не найден", 404, "NO_ACCOUNT");
  }

  return buildState(settled, account, buildWithdrawalLimits(platformLimits));
}
