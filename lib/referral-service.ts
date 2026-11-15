import {
  countReferrals,
  createReferralWithdrawalWithReservation,
  DEFAULT_ACCOUNT_ID,
  getAccountByUid,
  getOrCreateAccount,
  getRecentWithdrawals,
  setAccountReferrer,
  toPublicWithdrawal,
  type AccountRecord,
  type WithdrawalRecord,
} from "@/lib/models";
import {
  buildReferralLink,
  normalizeReferralPercent,
  parseReferralCode,
  REFERRAL_MIN_WITHDRAWAL,
  type ReferralState,
} from "@/lib/referrals";
import { formatUsdt, roundMoney } from "@/lib/trading";
import type {
  CreateReferralWithdrawalInput,
  RegisterReferralInput,
} from "@/lib/validation/referral";

const referralWithdrawalsLimit = 50;

export class ReferralError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "REFERRAL_ERROR") {
    super(message);
    this.name = "ReferralError";
    this.status = status;
    this.code = code;
  }
}

function toReferralState(
  account: AccountRecord,
  referralsCount: number,
  withdrawals: WithdrawalRecord[]
): ReferralState {
  const balance = roundMoney(account.referralBalance ?? 0);
  const reserved = roundMoney(account.referralWithdrawalReserved ?? 0);
  const rewardPercent = normalizeReferralPercent(account.referralPercent);

  return {
    uid: account.uid,
    link: buildReferralLink(account.uid),
    rewardPercent,
    balance,
    availableBalance: roundMoney(balance - reserved),
    referralsCount,
    isInfluencer: rewardPercent > 0,
    minWithdrawal: REFERRAL_MIN_WITHDRAWAL,
    withdrawals: withdrawals
      .filter((withdrawal) => (withdrawal.type ?? "balance") === "referral")
      .map(toPublicWithdrawal),
  };
}

export async function getReferralState(
  accountId: string = DEFAULT_ACCOUNT_ID
): Promise<ReferralState> {
  const account = await getOrCreateAccount(accountId);
  const [referralsCount, withdrawals] = await Promise.all([
    countReferrals(account.id),
    getRecentWithdrawals(account.id, referralWithdrawalsLimit),
  ]);

  return toReferralState(account, referralsCount, withdrawals);
}

export async function registerReferral(
  input: RegisterReferralInput,
  accountId: string = DEFAULT_ACCOUNT_ID
): Promise<ReferralState> {
  const referrerUid = parseReferralCode(input.code);

  if (referrerUid === null) {
    throw new ReferralError(
      "Некорректная реферальная ссылка",
      400,
      "INVALID_CODE"
    );
  }

  const account = await getOrCreateAccount(accountId);

  if (account.referrerId) {
    return getReferralState(accountId);
  }

  if (account.uid === referrerUid) {
    throw new ReferralError(
      "Нельзя пригласить самого себя",
      400,
      "SELF_REFERRAL"
    );
  }

  const referrer = await getAccountByUid(referrerUid);

  if (!referrer) {
    throw new ReferralError("Инфлюенсер не найден", 404, "REFERRER_NOT_FOUND");
  }

  await setAccountReferrer(account, referrer);

  return getReferralState(accountId);
}

export async function createReferralWithdrawal(
  input: CreateReferralWithdrawalInput,
  accountId: string = DEFAULT_ACCOUNT_ID
): Promise<ReferralState> {
  const amount = roundMoney(input.amount);

  if (amount < REFERRAL_MIN_WITHDRAWAL) {
    throw new ReferralError(
      `Минимальная сумма вывода реферальных — ${REFERRAL_MIN_WITHDRAWAL} USDT`,
      422,
      "MIN_AMOUNT"
    );
  }

  const withdrawalId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const account = await getOrCreateAccount(accountId);
    const balance = roundMoney(account.referralBalance ?? 0);
    const reserved = roundMoney(account.referralWithdrawalReserved ?? 0);
    const available = roundMoney(balance - reserved);

    if (amount > available + 0.001) {
      throw new ReferralError(
        `Недостаточно реферальных средств: доступно ${formatUsdt(available)} USDT`,
        422,
        "INSUFFICIENT_BALANCE"
      );
    }

    const withdrawal: WithdrawalRecord = {
      id: withdrawalId,
      accountId: account.id,
      uid: account.uid,
      amount,
      method: "usdt",
      type: "referral",
      status: "pending",
      address: input.address,
      phone: null,
      recipient: null,
      rejectionReason: null,
      createdAt,
      updatedAt: createdAt,
      processedAt: null,
    };

    const updatedAccount = await createReferralWithdrawalWithReservation(
      account,
      withdrawal
    );

    if (updatedAccount) {
      return getReferralState(accountId);
    }
  }

  throw new ReferralError(
    "Не удалось создать заявку на вывод. Попробуйте ещё раз.",
    409,
    "REFERRAL_WITHDRAWAL_CONFLICT"
  );
}
