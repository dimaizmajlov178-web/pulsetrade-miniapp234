import {
  ConditionalCheckFailedException,
  TransactionCanceledException,
} from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
  UpdateCommand,
  type TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";

import {
  roundMoney,
  type PublicAccount,
  type PublicTrade,
  type TradeStatus,
} from "@/lib/trading";
import {
  type DepositCurrency,
  type DepositNetwork,
  type DepositStatus,
  type PublicDeposit,
} from "@/lib/deposits";
import {
  type AdminWithdrawal,
  type PublicWithdrawal,
  type WithdrawalMethod,
  type WithdrawalStatus,
  type WithdrawalType,
} from "@/lib/withdrawals";
import { normalizeReferralPercent } from "@/lib/referrals";
import {
  DEFAULT_WAGERING_PERCENT,
  type BonusStatus,
  type PublicBonusActivation,
} from "@/lib/promo";
import type { AdminAuditRecord } from "@/lib/admin";
import type {
  AdminSupportTicket,
  SupportMessage,
  SupportTicket,
  SupportTicketStatus,
} from "@/lib/support";
import { docClient } from "./db";
import { IndexName, TableName } from "./schema";

export const DEFAULT_ACCOUNT_ID = "default";

export const INITIAL_UID = 624839;

const UID_COUNTER_ID = "__uid_counter__";
const INITIAL_DEMO_BALANCE = 500;
const INITIAL_REAL_BALANCE = 748.5;

export const PLATFORM_SETTINGS_ID = "__platform_limits__";

export interface Service {
  id: string;
  name: string;
  description?: string;
  status: "active" | "inactive" | "deploying";
  url?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountRecord {
  id: string;
  uid: number;
  demoBalance: number;
  realBalance: number;
  withdrawalReserved?: number;
  referrerId?: string | null;
  referrerUid?: number | null;
  referralPercent?: number;
  referralBalance?: number;
  referralWithdrawalReserved?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoredTrade extends Omit<
  PublicTrade,
  "exitPrice" | "resolvedAt"
> {
  accountId: string;
  demoStake: number;
  realStake: number;
  exitPrice?: number;
  resolvedAt?: string;
}

export type DepositProvider = "cryptopay" | "sandbox";

export interface DepositRecord {
  id: string;
  accountId: string;
  uid: number;
  amount: number;
  currency: DepositCurrency;
  network: DepositNetwork;
  status: DepositStatus;
  provider: DepositProvider;
  providerInvoiceId?: string;
  address: string | null;
  memo: string | null;
  paymentLink: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  confirmedAt?: string;
  checkStartedAt?: string;
  txHash?: string;
}

export interface WithdrawalRecord {
  id: string;
  accountId: string;
  uid: number;
  amount: number;
  method: WithdrawalMethod;
  type?: WithdrawalType;
  status: WithdrawalStatus;
  address: string | null;
  phone: string | null;
  recipient: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
}

export type PromoCodeStatus = "active" | "disabled";

export interface PromoCodeRecord {
  id: string;
  bonusAmount: number;
  status: PromoCodeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BonusActivationRecord {
  id: string;
  accountId: string;
  uid: number;
  code: string;
  bonusAmount: number;
  wageringPercent: number;
  wageredAmount: number;
  targetWagering: number;
  status: BonusStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface PromoSettingsRecord {
  id: string;
  wageringPercent: number;
  updatedAt: string;
}

export interface PlatformSettingsRecord {
  id: string;
  minStake: number;
  maxStake: number;
  withdrawalMin: number;
  withdrawalMax: number;
  updatedAt: string;
}

export interface SupportTicketRecord {
  id: string;
  accountId: string;
  uid: number;
  status: SupportTicketStatus;
  subject: string | null;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  messages: SupportMessage[];
}

export const PROMO_SETTINGS_ID = "promo";

export async function getServiceById(id: string): Promise<Service | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TableName.SERVICES,
      Key: { id },
    })
  );
  return (result.Item as Service) ?? null;
}

export async function getServicesByStatus(status: string): Promise<Service[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TableName.SERVICES,
      IndexName: IndexName.SERVICES_STATUS,
      KeyConditionExpression: "#status = :status",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":status": status,
      },
    })
  );
  return (result.Items as Service[]) ?? [];
}

export async function getAllServices(): Promise<Service[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TableName.SERVICES,
    })
  );
  return (result.Items as Service[]) ?? [];
}

export async function createService(
  data: Omit<Service, "createdAt" | "updatedAt">
): Promise<Service> {
  const now = new Date().toISOString();
  const service: Service = {
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TableName.SERVICES,
      Item: service,
    })
  );

  return service;
}

export async function updateService(
  id: string,
  data: Partial<Pick<Service, "name" | "description" | "status" | "url">>
): Promise<Service> {
  const updateExpr = [];
  const exprValues: Record<string, unknown> = {};
  const exprNames: Record<string, string> = {};

  if (data.name !== undefined) {
    updateExpr.push("#name = :name");
    exprValues[":name"] = data.name;
    exprNames["#name"] = "name";
  }

  if (data.description !== undefined) {
    updateExpr.push("#description = :description");
    exprValues[":description"] = data.description;
    exprNames["#description"] = "description";
  }

  if (data.status !== undefined) {
    updateExpr.push("#status = :status");
    exprValues[":status"] = data.status;
    exprNames["#status"] = "status";
  }

  if (data.url !== undefined) {
    updateExpr.push("#url = :url");
    exprValues[":url"] = data.url;
    exprNames["#url"] = "url";
  }

  updateExpr.push("updatedAt = :updatedAt");
  exprValues[":updatedAt"] = new Date().toISOString();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TableName.SERVICES,
      Key: { id },
      UpdateExpression: `set ${updateExpr.join(", ")}`,
      ExpressionAttributeValues: exprValues,
      ExpressionAttributeNames:
        Object.keys(exprNames).length > 0 ? exprNames : undefined,
      ReturnValues: "ALL_NEW",
    })
  );

  return result.Attributes as Service;
}

export async function deleteService(id: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: TableName.SERVICES,
      Key: { id },
    })
  );
}

export async function getAccountById(
  id: string = DEFAULT_ACCOUNT_ID
): Promise<AccountRecord | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TableName.ACCOUNTS,
      Key: { id },
    })
  );

  return (result.Item as AccountRecord) ?? null;
}

export async function getAccountByUid(
  uid: number
): Promise<AccountRecord | null> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TableName.ACCOUNTS,
      FilterExpression: "uid = :uid AND id <> :counterId",
      ExpressionAttributeValues: {
        ":uid": uid,
        ":counterId": UID_COUNTER_ID,
      },
    })
  );

  const account = (result.Items as AccountRecord[] | undefined)?.find(
    (item) => item.uid === uid
  );

  return account ?? null;
}

export async function getAllAccounts(limit = 100): Promise<AccountRecord[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TableName.ACCOUNTS,
      FilterExpression: "id <> :counterId",
      ExpressionAttributeValues: {
        ":counterId": UID_COUNTER_ID,
      },
      Limit: limit,
    })
  );

  const accounts = (result.Items as AccountRecord[] | undefined) ?? [];

  return accounts.sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)
  );
}

export async function countReferrals(referrerId: string): Promise<number> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TableName.ACCOUNTS,
      FilterExpression: "referrerId = :referrerId AND id <> :counterId",
      ExpressionAttributeValues: {
        ":referrerId": referrerId,
        ":counterId": UID_COUNTER_ID,
      },
      Select: "COUNT",
    })
  );

  return result.Count ?? 0;
}

export async function setAccountReferrer(
  account: AccountRecord,
  referrer: AccountRecord
): Promise<AccountRecord> {
  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TableName.ACCOUNTS,
        Key: { id: account.id },
        UpdateExpression:
          "SET referrerId = :referrerId, referrerUid = :referrerUid, updatedAt = :updatedAt",
        ConditionExpression:
          "attribute_exists(id) AND (attribute_not_exists(referrerId) OR attribute_type(referrerId, :nullType))",
        ExpressionAttributeValues: {
          ":referrerId": referrer.id,
          ":referrerUid": referrer.uid,
          ":nullType": "NULL",
          ":updatedAt": new Date().toISOString(),
        },
        ReturnValues: "ALL_NEW",
      })
    );

    return result.Attributes as AccountRecord;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return (await getAccountById(account.id)) ?? account;
    }

    throw error;
  }
}

async function allocateUid(): Promise<number> {
  const result = await docClient.send(
    new UpdateCommand({
      TableName: TableName.ACCOUNTS,
      Key: { id: UID_COUNTER_ID },
      UpdateExpression: "SET lastUid = if_not_exists(lastUid, :base) + :step",
      ExpressionAttributeValues: {
        ":base": INITIAL_UID - 1,
        ":step": 1,
      },
      ReturnValues: "ALL_NEW",
    })
  );

  const lastUid = Number(result.Attributes?.lastUid);

  if (!Number.isInteger(lastUid) || lastUid < INITIAL_UID) {
    throw new Error("Не удалось выделить UID пользователя");
  }

  return lastUid;
}

async function ensureAccountUid(
  account: AccountRecord
): Promise<AccountRecord> {
  if (typeof account.uid === "number") {
    return account;
  }

  const uid = await allocateUid();

  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TableName.ACCOUNTS,
        Key: { id: account.id },
        UpdateExpression: "SET uid = :uid",
        ConditionExpression:
          "attribute_exists(id) AND attribute_not_exists(uid)",
        ExpressionAttributeValues: { ":uid": uid },
        ReturnValues: "ALL_NEW",
      })
    );

    return result.Attributes as AccountRecord;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      const updated = await getAccountById(account.id);

      if (updated) {
        return ensureAccountUid(updated);
      }
    }

    throw error;
  }
}

export async function getOrCreateAccount(
  id: string = DEFAULT_ACCOUNT_ID
): Promise<AccountRecord> {
  const existing = await getAccountById(id);

  if (existing) {
    return ensureAccountUid(existing);
  }

  const now = new Date().toISOString();
  const uid = await allocateUid();
  const account: AccountRecord = {
    id,
    uid,
    demoBalance: INITIAL_DEMO_BALANCE,
    realBalance: INITIAL_REAL_BALANCE,
    withdrawalReserved: 0,
    referralPercent: 0,
    referralBalance: 0,
    referralWithdrawalReserved: 0,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: TableName.ACCOUNTS,
        Item: account,
        ConditionExpression: "attribute_not_exists(id)",
      })
    );

    return account;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      const created = await getAccountById(id);

      if (created) {
        return ensureAccountUid(created);
      }
    }

    throw error;
  }
}

export async function getRecentTrades(
  accountId: string,
  limit = 20
): Promise<StoredTrade[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TableName.TRADES,
      IndexName: IndexName.TRADES_ACCOUNT,
      KeyConditionExpression: "accountId = :accountId",
      ExpressionAttributeValues: {
        ":accountId": accountId,
      },
      ScanIndexForward: false,
      Limit: limit,
    })
  );

  return (result.Items as StoredTrade[]) ?? [];
}

export async function getOpenTrades(accountId: string): Promise<StoredTrade[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TableName.TRADES,
      IndexName: IndexName.TRADES_ACCOUNT,
      KeyConditionExpression: "accountId = :accountId",
      FilterExpression: "#status = :open",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":accountId": accountId,
        ":open": "open",
      },
    })
  );

  return (result.Items as StoredTrade[]) ?? [];
}

export async function getTradeById(id: string): Promise<StoredTrade | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TableName.TRADES,
      Key: { id },
    })
  );

  return (result.Item as StoredTrade) ?? null;
}

export async function commitTrade(
  account: AccountRecord,
  trade: StoredTrade,
  demoStake: number,
  realStake: number
): Promise<AccountRecord | null> {
  const nextDemoBalance = roundMoney(account.demoBalance - demoStake);
  const nextRealBalance = roundMoney(account.realBalance - realStake);
  const updatedAt = new Date().toISOString();

  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: TableName.TRADES,
              Item: trade,
              ConditionExpression: "attribute_not_exists(id)",
            },
          },
          {
            Update: {
              TableName: TableName.ACCOUNTS,
              Key: { id: account.id },
              UpdateExpression:
                "SET demoBalance = :demoBalance, realBalance = :realBalance, updatedAt = :updatedAt",
              ConditionExpression:
                "demoBalance = :expectedDemo AND realBalance = :expectedReal",
              ExpressionAttributeValues: {
                ":demoBalance": nextDemoBalance,
                ":realBalance": nextRealBalance,
                ":updatedAt": updatedAt,
                ":expectedDemo": account.demoBalance,
                ":expectedReal": account.realBalance,
              },
            },
          },
        ],
      })
    );

    return {
      ...account,
      demoBalance: nextDemoBalance,
      realBalance: nextRealBalance,
      updatedAt,
    };
  } catch (error) {
    if (error instanceof TransactionCanceledException) {
      return null;
    }

    throw error;
  }
}

export async function settleTradeRecord(
  trade: StoredTrade,
  exitPrice: number,
  status: TradeStatus
): Promise<boolean> {
  const profit =
    status === "won" ? roundMoney((trade.stake * trade.payoutRate) / 100) : 0;
  const payout = status === "won" ? roundMoney(trade.stake + profit) : 0;
  const resolvedAt = new Date().toISOString();

  const transactItems: TransactWriteCommandInput["TransactItems"] = [
    {
      Update: {
        TableName: TableName.TRADES,
        Key: { id: trade.id },
        UpdateExpression:
          "SET #status = :status, exitPrice = :exitPrice, profit = :profit, payout = :payout, resolvedAt = :resolvedAt",
        ConditionExpression: "#status = :open",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": status,
          ":open": "open",
          ":exitPrice": exitPrice,
          ":profit": profit,
          ":payout": payout,
          ":resolvedAt": resolvedAt,
        },
      },
    },
  ];

  if (payout > 0) {
    const demoCredit = roundMoney(payout * (trade.demoStake / trade.stake));
    const realCredit = roundMoney(payout - demoCredit);

    transactItems.push({
      Update: {
        TableName: TableName.ACCOUNTS,
        Key: { id: trade.accountId },
        UpdateExpression:
          "SET demoBalance = demoBalance + :demoCredit, realBalance = realBalance + :realCredit, updatedAt = :updatedAt",
        ConditionExpression: "attribute_exists(id)",
        ExpressionAttributeValues: {
          ":demoCredit": demoCredit,
          ":realCredit": realCredit,
          ":updatedAt": resolvedAt,
        },
      },
    });
  }

  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: transactItems,
      })
    );

    return true;
  } catch (error) {
    if (error instanceof TransactionCanceledException) {
      return false;
    }

    throw error;
  }
}

export async function createDepositRecord(
  deposit: DepositRecord
): Promise<DepositRecord> {
  await docClient.send(
    new PutCommand({
      TableName: TableName.DEPOSITS,
      Item: deposit,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );

  return deposit;
}

export async function getDepositById(
  id: string
): Promise<DepositRecord | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TableName.DEPOSITS,
      Key: { id },
    })
  );

  return (result.Item as DepositRecord) ?? null;
}

export async function getRecentDeposits(
  accountId: string,
  limit = 50
): Promise<DepositRecord[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TableName.DEPOSITS,
      IndexName: IndexName.DEPOSITS_ACCOUNT,
      KeyConditionExpression: "accountId = :accountId",
      ExpressionAttributeValues: {
        ":accountId": accountId,
      },
      ScanIndexForward: false,
      Limit: limit,
    })
  );

  return (result.Items as DepositRecord[]) ?? [];
}

export async function startDepositCheck(
  id: string
): Promise<DepositRecord | null> {
  const now = new Date().toISOString();

  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TableName.DEPOSITS,
        Key: { id },
        UpdateExpression:
          "SET checkStartedAt = if_not_exists(checkStartedAt, :now), updatedAt = :now",
        ConditionExpression: "attribute_exists(id) AND #status = :pending",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":now": now,
          ":pending": "pending",
        },
        ReturnValues: "ALL_NEW",
      })
    );

    return result.Attributes as DepositRecord;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return getDepositById(id);
    }

    throw error;
  }
}

export async function markDepositExpired(
  id: string
): Promise<DepositRecord | null> {
  const now = new Date().toISOString();

  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TableName.DEPOSITS,
        Key: { id },
        UpdateExpression: "SET #status = :expired, updatedAt = :now",
        ConditionExpression: "attribute_exists(id) AND #status = :pending",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":expired": "expired",
          ":pending": "pending",
          ":now": now,
        },
        ReturnValues: "ALL_NEW",
      })
    );

    return result.Attributes as DepositRecord;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return getDepositById(id);
    }

    throw error;
  }
}

export type ConfirmedDepositResult = {
  account: AccountRecord;
  deposit: DepositRecord;
  credited: boolean;
};

export async function confirmDepositRecord(
  deposit: DepositRecord,
  txHash?: string
): Promise<ConfirmedDepositResult | null> {
  const now = new Date().toISOString();
  const confirmedAt = now;
  const depositor = await getAccountById(deposit.accountId);
  const transactItems: TransactWriteCommandInput["TransactItems"] = [
    {
      Update: {
        TableName: TableName.DEPOSITS,
        Key: { id: deposit.id },
        UpdateExpression:
          "SET #status = :completed, confirmedAt = :confirmedAt, updatedAt = :confirmedAt, txHash = :txHash",
        ConditionExpression: "attribute_exists(id) AND #status = :pending",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":completed": "completed",
          ":pending": "pending",
          ":confirmedAt": confirmedAt,
          ":txHash": txHash ?? null,
        },
      },
    },
    {
      Update: {
        TableName: TableName.ACCOUNTS,
        Key: { id: deposit.accountId },
        UpdateExpression:
          "SET realBalance = realBalance + :amount, updatedAt = :updatedAt",
        ConditionExpression: "attribute_exists(id)",
        ExpressionAttributeValues: {
          ":amount": deposit.amount,
          ":updatedAt": now,
        },
      },
    },
  ];

  if (depositor?.referrerId && depositor.referrerId !== depositor.id) {
    const referrer = await getAccountById(depositor.referrerId);
    const percent = normalizeReferralPercent(referrer?.referralPercent);
    const commission = roundMoney((deposit.amount * percent) / 100);

    if (referrer && commission > 0) {
      transactItems.push({
        Update: {
          TableName: TableName.ACCOUNTS,
          Key: { id: referrer.id },
          UpdateExpression:
            "SET referralBalance = if_not_exists(referralBalance, :zero) + :commission, updatedAt = :updatedAt",
          ConditionExpression: "attribute_exists(id)",
          ExpressionAttributeValues: {
            ":zero": 0,
            ":commission": commission,
            ":updatedAt": now,
          },
        },
      });
    }
  }

  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: transactItems,
      })
    );

    const [updatedDeposit, account] = await Promise.all([
      getDepositById(deposit.id),
      getAccountById(deposit.accountId),
    ]);

    if (!updatedDeposit || !account) {
      return null;
    }

    return { account, deposit: updatedDeposit, credited: true };
  } catch (error) {
    if (error instanceof TransactionCanceledException) {
      const [currentDeposit, account] = await Promise.all([
        getDepositById(deposit.id),
        getAccountById(deposit.accountId),
      ]);

      if (currentDeposit?.status === "completed" && account) {
        return { account, deposit: currentDeposit, credited: false };
      }

      return null;
    }

    throw error;
  }
}

export async function getWithdrawalById(
  id: string
): Promise<WithdrawalRecord | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TableName.WITHDRAWALS,
      Key: { id },
    })
  );

  return (result.Item as WithdrawalRecord) ?? null;
}

export async function getRecentWithdrawals(
  accountId: string,
  limit = 50
): Promise<WithdrawalRecord[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TableName.WITHDRAWALS,
      IndexName: IndexName.WITHDRAWALS_ACCOUNT,
      KeyConditionExpression: "accountId = :accountId",
      ExpressionAttributeValues: {
        ":accountId": accountId,
      },
      ScanIndexForward: false,
      Limit: limit,
    })
  );

  return (result.Items as WithdrawalRecord[]) ?? [];
}

export async function getAllWithdrawals(
  limit = 200
): Promise<WithdrawalRecord[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TableName.WITHDRAWALS,
      Limit: limit,
    })
  );

  const withdrawals = (result.Items as WithdrawalRecord[]) ?? [];

  return withdrawals.sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)
  );
}

export async function createWithdrawalWithReservation(
  account: AccountRecord,
  withdrawal: WithdrawalRecord
): Promise<AccountRecord | null> {
  const reserved = roundMoney(account.withdrawalReserved ?? 0);
  const balance = roundMoney(account.demoBalance + account.realBalance);
  const available = roundMoney(balance - reserved);

  if (withdrawal.amount > available + 0.001) {
    return null;
  }

  const nextReserved = roundMoney(reserved + withdrawal.amount);
  const updatedAt = new Date().toISOString();

  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: TableName.WITHDRAWALS,
              Item: withdrawal,
              ConditionExpression: "attribute_not_exists(id)",
            },
          },
          {
            Update: {
              TableName: TableName.ACCOUNTS,
              Key: { id: account.id },
              UpdateExpression:
                "SET withdrawalReserved = if_not_exists(withdrawalReserved, :zero) + :amount, updatedAt = :updatedAt",
              ConditionExpression:
                "demoBalance = :expectedDemo AND realBalance = :expectedReal AND (attribute_not_exists(withdrawalReserved) OR withdrawalReserved = :expectedReserved)",
              ExpressionAttributeValues: {
                ":zero": 0,
                ":amount": withdrawal.amount,
                ":updatedAt": updatedAt,
                ":expectedDemo": account.demoBalance,
                ":expectedReal": account.realBalance,
                ":expectedReserved": reserved,
              },
            },
          },
        ],
      })
    );

    return {
      ...account,
      withdrawalReserved: nextReserved,
      updatedAt,
    };
  } catch (error) {
    if (error instanceof TransactionCanceledException) {
      return null;
    }

    throw error;
  }
}

export async function createReferralWithdrawalWithReservation(
  account: AccountRecord,
  withdrawal: WithdrawalRecord
): Promise<AccountRecord | null> {
  const balance = roundMoney(account.referralBalance ?? 0);
  const reserved = roundMoney(account.referralWithdrawalReserved ?? 0);
  const available = roundMoney(balance - reserved);

  if (withdrawal.amount > available + 0.001) {
    return null;
  }

  const updatedAt = new Date().toISOString();

  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: TableName.WITHDRAWALS,
              Item: withdrawal,
              ConditionExpression: "attribute_not_exists(id)",
            },
          },
          {
            Update: {
              TableName: TableName.ACCOUNTS,
              Key: { id: account.id },
              UpdateExpression:
                "SET referralWithdrawalReserved = if_not_exists(referralWithdrawalReserved, :zero) + :amount, updatedAt = :updatedAt",
              ConditionExpression:
                "(attribute_not_exists(referralBalance) OR referralBalance = :expectedBalance) AND (attribute_not_exists(referralWithdrawalReserved) OR referralWithdrawalReserved = :expectedReserved)",
              ExpressionAttributeValues: {
                ":zero": 0,
                ":amount": withdrawal.amount,
                ":updatedAt": updatedAt,
                ":expectedBalance": balance,
                ":expectedReserved": reserved,
              },
            },
          },
        ],
      })
    );

    return {
      ...account,
      referralWithdrawalReserved: roundMoney(reserved + withdrawal.amount),
      updatedAt,
    };
  } catch (error) {
    if (error instanceof TransactionCanceledException) {
      return null;
    }

    throw error;
  }
}

export async function settleWithdrawalRecord(
  withdrawal: WithdrawalRecord,
  decision: { status: "paid" } | { status: "rejected"; reason: string },
  audit?: AdminAuditRecord
): Promise<WithdrawalRecord | null> {
  const now = new Date().toISOString();
  const transactItems: TransactWriteCommandInput["TransactItems"] = [
    {
      Update: {
        TableName: TableName.WITHDRAWALS,
        Key: { id: withdrawal.id },
        UpdateExpression:
          "SET #status = :status, rejectionReason = :reason, processedAt = :now, updatedAt = :now",
        ConditionExpression: "attribute_exists(id) AND #status = :pending",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": decision.status,
          ":reason": decision.status === "rejected" ? decision.reason : null,
          ":now": now,
          ":pending": "pending",
        },
      },
    },
  ];

  const account = await getAccountById(withdrawal.accountId);

  if (!account) {
    return null;
  }

  const isReferral = withdrawal.type === "referral";

  if (decision.status === "paid") {
    const amount = withdrawal.amount;
    const balance = isReferral
      ? roundMoney(account.referralBalance ?? 0)
      : roundMoney(account.demoBalance + account.realBalance);
    const reserved = isReferral
      ? roundMoney(account.referralWithdrawalReserved ?? 0)
      : roundMoney(account.withdrawalReserved ?? 0);

    if (balance + 0.001 < amount || reserved + 0.001 < amount) {
      return null;
    }

    if (isReferral) {
      transactItems.push({
        Update: {
          TableName: TableName.ACCOUNTS,
          Key: { id: account.id },
          UpdateExpression:
            "SET referralBalance = referralBalance - :amount, referralWithdrawalReserved = referralWithdrawalReserved - :amount, updatedAt = :now",
          ConditionExpression:
            "referralBalance >= :amount AND attribute_exists(referralWithdrawalReserved) AND referralWithdrawalReserved >= :amount",
          ExpressionAttributeValues: {
            ":amount": amount,
            ":now": now,
          },
        },
      });
    } else {
      const demoDeduction = roundMoney(Math.min(account.demoBalance, amount));
      const realDeduction = roundMoney(amount - demoDeduction);

      transactItems.push({
        Update: {
          TableName: TableName.ACCOUNTS,
          Key: { id: account.id },
          UpdateExpression:
            "SET demoBalance = demoBalance - :demoDeduction, realBalance = realBalance - :realDeduction, withdrawalReserved = withdrawalReserved - :amount, updatedAt = :now",
          ConditionExpression:
            "demoBalance >= :demoDeduction AND realBalance >= :realDeduction AND attribute_exists(withdrawalReserved) AND withdrawalReserved >= :amount",
          ExpressionAttributeValues: {
            ":demoDeduction": demoDeduction,
            ":realDeduction": realDeduction,
            ":amount": amount,
            ":now": now,
          },
        },
      });
    }
  } else if (isReferral) {
    transactItems.push({
      Update: {
        TableName: TableName.ACCOUNTS,
        Key: { id: account.id },
        UpdateExpression:
          "SET referralWithdrawalReserved = referralWithdrawalReserved - :amount, updatedAt = :now",
        ConditionExpression:
          "attribute_exists(referralWithdrawalReserved) AND referralWithdrawalReserved >= :amount",
        ExpressionAttributeValues: {
          ":amount": withdrawal.amount,
          ":now": now,
        },
      },
    });
  } else {
    transactItems.push({
      Update: {
        TableName: TableName.ACCOUNTS,
        Key: { id: account.id },
        UpdateExpression:
          "SET withdrawalReserved = withdrawalReserved - :amount, updatedAt = :now",
        ConditionExpression:
          "attribute_exists(withdrawalReserved) AND withdrawalReserved >= :amount",
        ExpressionAttributeValues: {
          ":amount": withdrawal.amount,
          ":now": now,
        },
      },
    });
  }

  if (audit) {
    transactItems.push({
      Put: {
        TableName: TableName.ADMIN_AUDIT_LOG,
        Item: audit,
        ConditionExpression: "attribute_not_exists(id)",
      },
    });
  }

  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: transactItems,
      })
    );

    return {
      ...withdrawal,
      status: decision.status,
      rejectionReason: decision.status === "rejected" ? decision.reason : null,
      processedAt: now,
      updatedAt: now,
    };
  } catch (error) {
    if (error instanceof TransactionCanceledException) {
      const current = await getWithdrawalById(withdrawal.id);

      if (current?.status === decision.status) {
        return current;
      }

      return null;
    }

    throw error;
  }
}

export async function getPlatformSettingsRecord(): Promise<PlatformSettingsRecord | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TableName.SETTINGS,
      Key: { id: PLATFORM_SETTINGS_ID },
    })
  );

  return (result.Item as PlatformSettingsRecord) ?? null;
}

export async function putPlatformSettingsRecord(
  limits: Omit<PlatformSettingsRecord, "id" | "updatedAt">
): Promise<PlatformSettingsRecord> {
  const record: PlatformSettingsRecord = {
    id: PLATFORM_SETTINGS_ID,
    ...limits,
    updatedAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TableName.SETTINGS,
      Item: record,
    })
  );

  return record;
}

export async function adjustAccountBalancesWithAudit(
  account: AccountRecord,
  nextDemoBalance: number,
  nextRealBalance: number,
  audit: AdminAuditRecord
): Promise<AccountRecord | null> {
  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: TableName.ACCOUNTS,
              Key: { id: account.id },
              UpdateExpression:
                "SET demoBalance = :demoBalance, realBalance = :realBalance, updatedAt = :updatedAt",
              ConditionExpression:
                "attribute_exists(id) AND demoBalance = :expectedDemo AND realBalance = :expectedReal",
              ExpressionAttributeValues: {
                ":demoBalance": nextDemoBalance,
                ":realBalance": nextRealBalance,
                ":updatedAt": audit.createdAt,
                ":expectedDemo": account.demoBalance,
                ":expectedReal": account.realBalance,
              },
            },
          },
          {
            Put: {
              TableName: TableName.ADMIN_AUDIT_LOG,
              Item: audit,
              ConditionExpression: "attribute_not_exists(id)",
            },
          },
        ],
      })
    );

    return {
      ...account,
      demoBalance: nextDemoBalance,
      realBalance: nextRealBalance,
      updatedAt: audit.createdAt,
    };
  } catch (error) {
    if (error instanceof TransactionCanceledException) {
      return null;
    }

    throw error;
  }
}

export async function putAdminAuditRecord(
  record: AdminAuditRecord
): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TableName.ADMIN_AUDIT_LOG,
      Item: record,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );
}

export async function getAdminAuditRecords(
  limit = 200
): Promise<AdminAuditRecord[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TableName.ADMIN_AUDIT_LOG,
      Limit: limit,
    })
  );

  const records = (result.Items as AdminAuditRecord[] | undefined) ?? [];

  return records.sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)
  );
}

export async function createSupportTicketRecord(
  record: SupportTicketRecord
): Promise<SupportTicketRecord> {
  await docClient.send(
    new PutCommand({
      TableName: TableName.SUPPORT_TICKETS,
      Item: record,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );

  return record;
}

export async function getSupportTicketById(
  id: string
): Promise<SupportTicketRecord | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TableName.SUPPORT_TICKETS,
      Key: { id },
    })
  );

  return (result.Item as SupportTicketRecord) ?? null;
}

export async function getAccountSupportTickets(
  accountId: string,
  limit = 50
): Promise<SupportTicketRecord[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TableName.SUPPORT_TICKETS,
      IndexName: IndexName.SUPPORT_ACCOUNT,
      KeyConditionExpression: "accountId = :accountId",
      ExpressionAttributeValues: {
        ":accountId": accountId,
      },
      ScanIndexForward: false,
      Limit: limit,
    })
  );

  return (result.Items as SupportTicketRecord[]) ?? [];
}

export async function getAllSupportTickets(
  limit = 200
): Promise<SupportTicketRecord[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TableName.SUPPORT_TICKETS,
      Limit: limit,
    })
  );

  const tickets = (result.Items as SupportTicketRecord[] | undefined) ?? [];

  return tickets.sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)
  );
}

export async function appendUserSupportMessageRecord(
  id: string,
  message: SupportMessage
): Promise<SupportTicketRecord | null> {
  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TableName.SUPPORT_TICKETS,
        Key: { id },
        UpdateExpression:
          "SET #messages = list_append(if_not_exists(#messages, :empty), :message), updatedAt = :now",
        ConditionExpression: "attribute_exists(id) AND #status <> :closed",
        ExpressionAttributeNames: {
          "#messages": "messages",
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":empty": [],
          ":message": [message],
          ":now": message.createdAt,
          ":closed": "closed",
        },
        ReturnValues: "ALL_NEW",
      })
    );

    return (result.Attributes as SupportTicketRecord) ?? null;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return null;
    }

    throw error;
  }
}

export async function takeSupportTicketRecord(
  id: string,
  assignedTo: string
): Promise<SupportTicketRecord | null> {
  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TableName.SUPPORT_TICKETS,
        Key: { id },
        UpdateExpression:
          "SET #status = :inProgress, assignedTo = :assignedTo, updatedAt = :now",
        ConditionExpression: "attribute_exists(id) AND #status = :new",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":new": "new",
          ":inProgress": "in_progress",
          ":assignedTo": assignedTo,
          ":now": new Date().toISOString(),
        },
        ReturnValues: "ALL_NEW",
      })
    );

    return (result.Attributes as SupportTicketRecord) ?? null;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return null;
    }

    throw error;
  }
}

export async function replySupportTicketRecord(
  id: string,
  message: SupportMessage,
  assignedTo: string
): Promise<SupportTicketRecord | null> {
  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TableName.SUPPORT_TICKETS,
        Key: { id },
        UpdateExpression:
          "SET #messages = list_append(if_not_exists(#messages, :empty), :message), #status = :inProgress, assignedTo = :assignedTo, updatedAt = :now",
        ConditionExpression: "attribute_exists(id) AND #status <> :closed",
        ExpressionAttributeNames: {
          "#messages": "messages",
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":empty": [],
          ":message": [message],
          ":inProgress": "in_progress",
          ":assignedTo": assignedTo,
          ":now": message.createdAt,
          ":closed": "closed",
        },
        ReturnValues: "ALL_NEW",
      })
    );

    return (result.Attributes as SupportTicketRecord) ?? null;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return null;
    }

    throw error;
  }
}

export async function closeSupportTicketRecord(
  id: string
): Promise<SupportTicketRecord | null> {
  const now = new Date().toISOString();

  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TableName.SUPPORT_TICKETS,
        Key: { id },
        UpdateExpression:
          "SET #status = :closed, closedAt = :now, updatedAt = :now",
        ConditionExpression: "attribute_exists(id) AND #status <> :closed",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":closed": "closed",
          ":now": now,
        },
        ReturnValues: "ALL_NEW",
      })
    );

    return (result.Attributes as SupportTicketRecord) ?? null;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return getSupportTicketById(id);
    }

    throw error;
  }
}

export async function getAllPromoCodes(): Promise<PromoCodeRecord[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TableName.PROMO_CODES,
    })
  );

  const promos = (result.Items as PromoCodeRecord[] | undefined) ?? [];

  return promos.sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)
  );
}

export async function createPromoCodeRecord(
  record: PromoCodeRecord
): Promise<PromoCodeRecord> {
  await docClient.send(
    new PutCommand({
      TableName: TableName.PROMO_CODES,
      Item: record,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );

  return record;
}

export async function updatePromoCodeRecord(
  id: string,
  data: { bonusAmount: number; status: PromoCodeStatus }
): Promise<PromoCodeRecord | null> {
  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TableName.PROMO_CODES,
        Key: { id },
        UpdateExpression:
          "SET bonusAmount = :bonusAmount, #status = :status, updatedAt = :updatedAt",
        ConditionExpression: "attribute_exists(id)",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":bonusAmount": data.bonusAmount,
          ":status": data.status,
          ":updatedAt": new Date().toISOString(),
        },
        ReturnValues: "ALL_NEW",
      })
    );

    return (result.Attributes as PromoCodeRecord) ?? null;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return null;
    }

    throw error;
  }
}

export async function getPromoCodeById(
  id: string
): Promise<PromoCodeRecord | null> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TableName.PROMO_CODES,
        Key: { id },
      })
    );

    return (result.Item as PromoCodeRecord) ?? null;
  } catch (error) {
    console.warn(
      "Не удалось прочитать промокод:",
      error instanceof Error ? error.message : error
    );

    return null;
  }
}

export async function getPromoWageringPercent(): Promise<number> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TableName.SETTINGS,
        Key: { id: PROMO_SETTINGS_ID },
      })
    );

    const value = Number(
      (result.Item as PromoSettingsRecord | undefined)?.wageringPercent
    );

    if (Number.isFinite(value) && value > 0 && value <= 1000) {
      return value;
    }
  } catch (error) {
    console.warn(
      "Не удалось прочитать настройку отыгрыша:",
      error instanceof Error ? error.message : error
    );
  }

  return DEFAULT_WAGERING_PERCENT;
}

export async function getBonusActivationById(
  id: string
): Promise<BonusActivationRecord | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TableName.BONUS_ACTIVATIONS,
      Key: { id },
    })
  );

  return (result.Item as BonusActivationRecord) ?? null;
}

export async function getBonusActivations(
  accountId: string,
  limit = 50
): Promise<BonusActivationRecord[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TableName.BONUS_ACTIVATIONS,
      IndexName: IndexName.BONUS_ACTIVATIONS_ACCOUNT,
      KeyConditionExpression: "accountId = :accountId",
      ExpressionAttributeValues: {
        ":accountId": accountId,
      },
      ScanIndexForward: false,
      Limit: limit,
    })
  );

  return (result.Items as BonusActivationRecord[]) ?? [];
}

export async function activateBonusWithCredit(
  account: AccountRecord,
  activation: BonusActivationRecord
): Promise<AccountRecord | null> {
  const nextRealBalance = roundMoney(
    account.realBalance + activation.bonusAmount
  );
  const updatedAt = activation.createdAt;

  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: TableName.BONUS_ACTIVATIONS,
              Item: activation,
              ConditionExpression: "attribute_not_exists(id)",
            },
          },
          {
            Update: {
              TableName: TableName.ACCOUNTS,
              Key: { id: account.id },
              UpdateExpression:
                "SET realBalance = realBalance + :bonus, updatedAt = :updatedAt",
              ConditionExpression: "attribute_exists(id)",
              ExpressionAttributeValues: {
                ":bonus": activation.bonusAmount,
                ":updatedAt": updatedAt,
              },
            },
          },
        ],
      })
    );

    return {
      ...account,
      realBalance: nextRealBalance,
      updatedAt,
    };
  } catch (error) {
    if (error instanceof TransactionCanceledException) {
      return null;
    }

    throw error;
  }
}

export async function applyWageringProgress(
  accountId: string,
  realStake: number
): Promise<void> {
  const amount = roundMoney(realStake);

  if (amount <= 0) {
    return;
  }

  const activations = await getBonusActivations(accountId, 100);
  const now = new Date().toISOString();

  await Promise.all(
    activations
      .filter((activation) => activation.status === "active")
      .map(async (activation) => {
        const remaining = roundMoney(
          activation.targetWagering - activation.wageredAmount
        );

        if (remaining <= 0) {
          return;
        }

        const increment = roundMoney(Math.min(amount, remaining));

        try {
          const result = await docClient.send(
            new UpdateCommand({
              TableName: TableName.BONUS_ACTIVATIONS,
              Key: { id: activation.id },
              UpdateExpression:
                "SET wageredAmount = if_not_exists(wageredAmount, :zero) + :increment, updatedAt = :now",
              ConditionExpression: "attribute_exists(id) AND #status = :active",
              ExpressionAttributeNames: {
                "#status": "status",
              },
              ExpressionAttributeValues: {
                ":zero": 0,
                ":increment": increment,
                ":now": now,
                ":active": "active",
              },
              ReturnValues: "ALL_NEW",
            })
          );

          const nextWagered = roundMoney(
            Number(result.Attributes?.wageredAmount ?? 0)
          );

          if (nextWagered >= activation.targetWagering - 0.001) {
            await docClient.send(
              new UpdateCommand({
                TableName: TableName.BONUS_ACTIVATIONS,
                Key: { id: activation.id },
                UpdateExpression:
                  "SET #status = :completed, completedAt = :now, updatedAt = :now",
                ConditionExpression:
                  "attribute_exists(id) AND #status = :active AND wageredAmount >= :target",
                ExpressionAttributeNames: {
                  "#status": "status",
                },
                ExpressionAttributeValues: {
                  ":completed": "completed",
                  ":active": "active",
                  ":now": now,
                  ":target": activation.targetWagering,
                },
              })
            );
          }
        } catch (error) {
          if (error instanceof ConditionalCheckFailedException) {
            return;
          }

          console.error(
            `Не удалось обновить отыгрыш бонуса ${activation.id}:`,
            error instanceof Error ? error.message : error
          );
        }
      })
  );
}

export function toPublicBonusActivation(
  activation: BonusActivationRecord
): PublicBonusActivation {
  const requiredWagering = roundMoney(activation.targetWagering);
  const wageredAmount = roundMoney(
    Math.max(0, Math.min(activation.wageredAmount, requiredWagering))
  );
  const progressPercent =
    requiredWagering > 0
      ? Math.min(100, Math.round((wageredAmount / requiredWagering) * 100))
      : 100;
  const status: BonusStatus =
    activation.status === "completed" || progressPercent >= 100
      ? "completed"
      : "active";

  return {
    id: activation.id,
    code: activation.code,
    bonusAmount: activation.bonusAmount,
    wageringPercent: activation.wageringPercent,
    wageredAmount,
    requiredWagering,
    progressPercent,
    status,
    createdAt: activation.createdAt,
    updatedAt: activation.updatedAt,
    completedAt: activation.completedAt ?? null,
  };
}

export function toPublicAccount(account: AccountRecord): PublicAccount {
  return {
    uid: account.uid,
    balance: roundMoney(account.demoBalance + account.realBalance),
    updatedAt: account.updatedAt,
  };
}

export function toPublicSupportTicket(
  ticket: SupportTicketRecord
): SupportTicket {
  return {
    id: ticket.id,
    status: ticket.status,
    subject: ticket.subject ?? null,
    assignedTo: ticket.assignedTo ?? null,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    closedAt: ticket.closedAt ?? null,
    messages: [...(ticket.messages ?? [])].sort(
      (left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt)
    ),
  };
}

export function toAdminSupportTicket(
  ticket: SupportTicketRecord
): AdminSupportTicket {
  return {
    ...toPublicSupportTicket(ticket),
    uid: ticket.uid,
  };
}

export function toPublicDeposit(deposit: DepositRecord): PublicDeposit {
  return {
    id: deposit.id,
    amount: deposit.amount,
    currency: deposit.currency,
    network: deposit.network,
    status: deposit.status,
    address: deposit.address ?? null,
    memo: deposit.memo ?? null,
    paymentLink: deposit.paymentLink,
    createdAt: deposit.createdAt,
    expiresAt: deposit.expiresAt,
    confirmedAt: deposit.confirmedAt ?? null,
  };
}

export function toPublicWithdrawal(
  withdrawal: WithdrawalRecord
): PublicWithdrawal {
  return {
    id: withdrawal.id,
    amount: withdrawal.amount,
    method: withdrawal.method,
    type: withdrawal.type ?? "balance",
    status: withdrawal.status,
    address: withdrawal.address ?? null,
    phone: withdrawal.phone ?? null,
    recipient: withdrawal.recipient ?? null,
    rejectionReason: withdrawal.rejectionReason ?? null,
    createdAt: withdrawal.createdAt,
    updatedAt: withdrawal.updatedAt,
    processedAt: withdrawal.processedAt ?? null,
  };
}

export function toAdminWithdrawal(
  withdrawal: WithdrawalRecord
): AdminWithdrawal {
  return {
    ...toPublicWithdrawal(withdrawal),
    uid: withdrawal.uid,
  };
}

export function toPublicTrade(trade: StoredTrade): PublicTrade {
  return {
    id: trade.id,
    pairId: trade.pairId,
    symbol: trade.symbol,
    direction: trade.direction,
    stake: trade.stake,
    expiryMinutes: trade.expiryMinutes,
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice ?? null,
    status: trade.status,
    profit: trade.profit,
    payout: trade.payout,
    payoutRate: trade.payoutRate,
    createdAt: trade.createdAt,
    expiresAt: trade.expiresAt,
    resolvedAt: trade.resolvedAt ?? null,
  };
}
