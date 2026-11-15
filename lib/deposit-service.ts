import {
  createDepositRecord,
  DEFAULT_ACCOUNT_ID,
  getAccountById,
  getDepositById,
  getOrCreateAccount,
  getRecentDeposits,
  markDepositExpired,
  startDepositCheck,
  confirmDepositRecord,
  toPublicAccount,
  toPublicDeposit,
  type DepositRecord,
} from "@/lib/models";
import {
  depositExpiryMinutes,
  depositHistoryLimit,
  depositLimitsConfig,
  type DepositLimits,
  type PublicDeposit,
} from "@/lib/deposits";
import { roundMoney, type PublicAccount } from "@/lib/trading";
import {
  createDepositInvoice,
  getDepositInvoiceStatus,
} from "@/lib/ton-payment-gateway";
import type { CreateDepositInput } from "@/lib/validation/deposit";

export type DepositsState = {
  account: PublicAccount;
  deposits: PublicDeposit[];
  limits: DepositLimits;
};

export type DepositState = {
  account: PublicAccount;
  deposit: PublicDeposit;
  limits: DepositLimits;
};

export class DepositError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "DEPOSIT_ERROR") {
    super(message);
    this.name = "DepositError";
    this.status = status;
    this.code = code;
  }
}

function buildState(
  deposit: DepositRecord,
  account: Awaited<ReturnType<typeof getOrCreateAccount>>
): DepositState {
  return {
    account: toPublicAccount(account),
    deposit: toPublicDeposit(deposit),
    limits: depositLimitsConfig,
  };
}

async function loadAccountForDeposit(
  deposit: DepositRecord
): Promise<Awaited<ReturnType<typeof getOrCreateAccount>>> {
  const account = await getAccountById(deposit.accountId);

  if (!account) {
    throw new DepositError("Счёт для пополнения не найден", 404, "NO_ACCOUNT");
  }

  return account;
}

export async function getDepositsState(
  accountId: string = DEFAULT_ACCOUNT_ID
): Promise<DepositsState> {
  const account = await getOrCreateAccount(accountId);
  const deposits = await getRecentDeposits(account.id, depositHistoryLimit);

  return {
    account: toPublicAccount(account),
    deposits: deposits.map(toPublicDeposit),
    limits: depositLimitsConfig,
  };
}

export async function getDepositState(id: string): Promise<DepositState> {
  let deposit = await getDepositById(id);

  if (!deposit) {
    throw new DepositError("Пополнение не найдено", 404, "NOT_FOUND");
  }

  if (
    deposit.status === "pending" &&
    Date.parse(deposit.expiresAt) <= Date.now()
  ) {
    deposit = (await markDepositExpired(deposit.id)) ?? deposit;
  }

  const account = await loadAccountForDeposit(deposit);

  return buildState(deposit, account);
}

export async function createDeposit(
  input: CreateDepositInput
): Promise<DepositState> {
  const account = await getOrCreateAccount();
  const amount = roundMoney(input.amount);
  const depositId = crypto.randomUUID();
  const createdAt = new Date();
  const expiresAt = new Date(
    createdAt.getTime() + depositExpiryMinutes * 60_000
  ).toISOString();

  let invoice;

  try {
    invoice = await createDepositInvoice({
      depositId,
      amount,
      uid: account.uid,
    });
  } catch (error) {
    console.error(
      "Не удалось создать счёт на пополнение:",
      error instanceof Error ? error.message : error
    );

    throw new DepositError(
      "Платёжный шлюз временно недоступен. Попробуйте позже.",
      502,
      "GATEWAY_UNAVAILABLE"
    );
  }

  const deposit: DepositRecord = {
    id: depositId,
    accountId: account.id,
    uid: account.uid,
    amount,
    currency: "USDT",
    network: "TON",
    status: "pending",
    provider: invoice.provider,
    providerInvoiceId: invoice.providerInvoiceId,
    address: invoice.address,
    memo: invoice.memo,
    paymentLink: invoice.paymentLink,
    createdAt: createdAt.toISOString(),
    updatedAt: createdAt.toISOString(),
    expiresAt,
  };

  await createDepositRecord(deposit);

  return buildState(deposit, account);
}

export async function checkDeposit(id: string): Promise<DepositState> {
  let deposit = await getDepositById(id);

  if (!deposit) {
    throw new DepositError("Пополнение не найдено", 404, "NOT_FOUND");
  }

  if (deposit.status !== "pending") {
    return buildState(deposit, await loadAccountForDeposit(deposit));
  }

  if (Date.parse(deposit.expiresAt) <= Date.now()) {
    deposit = (await markDepositExpired(deposit.id)) ?? deposit;
    return buildState(deposit, await loadAccountForDeposit(deposit));
  }

  try {
    if (deposit.provider === "sandbox" && !deposit.checkStartedAt) {
      deposit = (await startDepositCheck(deposit.id)) ?? deposit;
    }

    const invoiceStatus = await getDepositInvoiceStatus(deposit);

    if (invoiceStatus.status === "paid") {
      const confirmed = await confirmDepositRecord(
        deposit,
        invoiceStatus.txHash
      );

      if (!confirmed) {
        throw new DepositError(
          "Не удалось зачислить средства. Попробуйте ещё раз.",
          409,
          "CONFIRM_CONFLICT"
        );
      }

      return buildState(confirmed.deposit, confirmed.account);
    }

    if (invoiceStatus.status === "expired") {
      deposit = (await markDepositExpired(deposit.id)) ?? deposit;
    }

    return buildState(deposit, await loadAccountForDeposit(deposit));
  } catch (error) {
    if (error instanceof DepositError) {
      throw error;
    }

    console.error(
      "Не удалось проверить платёж:",
      error instanceof Error ? error.message : error
    );

    throw new DepositError(
      "Не удалось проверить платёж. Попробуйте ещё раз.",
      502,
      "GATEWAY_UNAVAILABLE"
    );
  }
}
