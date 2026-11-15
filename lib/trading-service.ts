import { fetchMarketSnapshot } from "@/lib/binance";
import { getMarketPair } from "@/lib/market-data";
import {
  applyWageringProgress,
  commitTrade,
  DEFAULT_ACCOUNT_ID,
  getAccountById,
  getOpenTrades,
  getOrCreateTelegramAccount,
  getRecentTrades,
  getTradeById,
  settleTradeRecord,
  toPublicAccount,
  toPublicTrade,
  type StoredTrade,
} from "@/lib/models";
import {
  formatUsdt,
  maxActiveTrades,
  resolveTradeStatus,
  roundMoney,
  tradeHistoryLimit,
  type PublicAccount,
  type PublicTrade,
  type TradingLimits,
} from "@/lib/trading";
import { buildTradingLimits, getPlatformLimits } from "@/lib/platform-settings";
import type { CreateTradeInput } from "@/lib/validation/trade";

export type TradingState = {
  account: PublicAccount;
  trades: PublicTrade[];
  limits: TradingLimits;
};

export class TradingError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "TRADE_ERROR") {
    super(message);
    this.name = "TradingError";
    this.status = status;
    this.code = code;
  }
}

export async function settleExpiredTrades(
  accountId: string = DEFAULT_ACCOUNT_ID
): Promise<void> {
  const openTrades = await getOpenTrades(accountId);
  const now = Date.now();

  await Promise.all(
    openTrades
      .filter((trade) => Date.parse(trade.expiresAt) <= now)
      .map(async (trade) => {
        const pair = getMarketPair(trade.pairId);

        if (!pair) {
          return;
        }

        try {
          const snapshot = await fetchMarketSnapshot(pair);
          const status = resolveTradeStatus(
            trade.direction,
            trade.entryPrice,
            snapshot.price
          );

          await settleTradeRecord(trade, snapshot.price, status);
        } catch (error) {
          console.error(
            `Не удалось закрыть сделку ${trade.id}:`,
            error instanceof Error ? error.message : error
          );
        }
      })
  );
}

export async function getTradingState(
  telegramId: number | null = null
): Promise<TradingState> {
  const account = await getOrCreateTelegramAccount(telegramId);
  await settleExpiredTrades(account.id);

  const [freshAccount, trades, platformLimits] = await Promise.all([
    getOrCreateTelegramAccount(telegramId),
    getRecentTrades(account.id, tradeHistoryLimit),
    getPlatformLimits(),
  ]);

  return {
    account: toPublicAccount(freshAccount),
    trades: trades.map(toPublicTrade),
    limits: buildTradingLimits(platformLimits),
  };
}

export async function placeTrade(
  input: CreateTradeInput,
  telegramId: number | null = null
): Promise<{ account: PublicAccount; trade: PublicTrade }> {
  const pair = getMarketPair(input.pairId);

  if (!pair) {
    throw new TradingError("Неизвестная торговая пара", 400, "INVALID_PAIR");
  }

  const platformLimits = await getPlatformLimits();
  const limits = buildTradingLimits(platformLimits);
  const stake = roundMoney(input.stake);

  if (stake < limits.minStake) {
    throw new TradingError(
      `Минимальная ставка — ${limits.minStake} USDT`,
      422,
      "MIN_STAKE"
    );
  }

  if (stake > limits.maxStake) {
    throw new TradingError(
      `Максимальная ставка — ${limits.maxStake} USDT`,
      422,
      "MAX_STAKE"
    );
  }

  const initialAccount = await getOrCreateTelegramAccount(telegramId);
  await settleExpiredTrades(initialAccount.id);

  const activeTrades = await getOpenTrades(initialAccount.id);

  if (activeTrades.length >= maxActiveTrades) {
    throw new TradingError(
      `Достигнут лимит ${maxActiveTrades} активных сделок. Дождитесь завершения одной из них.`,
      409,
      "ACTIVE_TRADE_LIMIT"
    );
  }

  const currentAccount = await getOrCreateTelegramAccount(telegramId);
  const initialBalance = roundMoney(
    currentAccount.demoBalance + currentAccount.realBalance
  );

  if (stake > initialBalance + 0.001) {
    throw new TradingError(
      `Недостаточно средств: доступно ${formatUsdt(initialBalance)} USDT`,
      422,
      "INSUFFICIENT_BALANCE"
    );
  }

  let entryPrice: number;

  try {
    const snapshot = await fetchMarketSnapshot(pair);
    entryPrice = snapshot.price;
  } catch {
    throw new TradingError(
      "Источник котировок временно недоступен. Попробуйте ещё раз.",
      502,
      "QUOTES_UNAVAILABLE"
    );
  }

  const createdAt = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + input.expiryMinutes * 60_000
  ).toISOString();
  const tradeId = crypto.randomUUID();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const account = await getOrCreateTelegramAccount(telegramId);
    const balance = roundMoney(account.demoBalance + account.realBalance);

    if (stake > balance + 0.001) {
      throw new TradingError(
        `Недостаточно средств: доступно ${formatUsdt(balance)} USDT`,
        422,
        "INSUFFICIENT_BALANCE"
      );
    }

    const demoStake = roundMoney(Math.min(account.demoBalance, stake));
    const realStake = roundMoney(stake - demoStake);

    if (realStake > account.realBalance + 0.001) {
      continue;
    }

    const trade: StoredTrade = {
      id: tradeId,
      accountId: account.id,
      pairId: pair.id,
      symbol: pair.symbol,
      direction: input.direction,
      stake,
      expiryMinutes: input.expiryMinutes,
      entryPrice,
      status: "open",
      profit: 0,
      payout: 0,
      payoutRate: limits.payoutRate,
      createdAt,
      expiresAt,
      demoStake,
      realStake,
    };

    const updatedAccount = await commitTrade(
      account,
      trade,
      demoStake,
      realStake
    );

    if (updatedAccount) {
      try {
        await applyWageringProgress(updatedAccount.id, realStake);
      } catch (error) {
        console.error(
          "Не удалось обновить прогресс отыгрыша бонуса:",
          error instanceof Error ? error.message : error
        );
      }

      return {
        account: toPublicAccount(updatedAccount),
        trade: toPublicTrade(trade),
      };
    }

    const existingTrade = await getTradeById(tradeId);

    if (existingTrade) {
      const freshAccount = await getAccountById(existingTrade.accountId);

      if (freshAccount) {
        return {
          account: toPublicAccount(freshAccount),
          trade: toPublicTrade(existingTrade),
        };
      }
    }
  }

  throw new TradingError(
    "Не удалось подтвердить ставку. Попробуйте ещё раз.",
    409,
    "TRADE_CONFLICT"
  );
}
