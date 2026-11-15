"use client";

import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Loader2,
  RefreshCw,
  Timer,
  TrendingDown,
  TrendingUp,
  Wallet,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PriceChart } from "@/components/price-chart";
import { useMarketQuotes, type MarketQuote } from "@/hooks/use-market-quotes";
import { useTrading } from "@/hooks/use-trading";
import {
  defaultMarketTimeframe,
  getMarketPair,
  marketPairs,
  marketTimeframeIds,
  marketTimeframeLabels,
  type MarketPairId,
  type MarketTimeframeId,
} from "@/lib/market-data";
import {
  expiryOptions,
  maxActiveTrades,
  payoutRate,
  roundMoney,
  tradeDirectionLabels,
  type PublicTrade,
  type TradeDirection,
  type TradingLimits,
} from "@/lib/trading";
import { createTradeSchema } from "@/lib/validation/trade";
import { cn } from "@/lib/utils";

const priceFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const amountFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 2,
});

const timeFormatter = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const defaultStakeInput = "10";

function formatPrice(value: number) {
  return priceFormatter.format(value);
}

function formatAmount(value: number) {
  return amountFormatter.format(value);
}

function formatChange(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatTime(timestamp: number) {
  return timeFormatter.format(new Date(timestamp));
}

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function parseStake(raw: string) {
  return Number(raw.replace(",", ".").trim());
}

function getStakeError(
  raw: string,
  balance: number | null,
  limits: TradingLimits
): string | null {
  if (!raw.trim()) {
    return "Введите сумму ставки";
  }

  const value = parseStake(raw);

  if (!Number.isFinite(value) || value <= 0) {
    return "Введите сумму числом";
  }

  if (value < limits.minStake) {
    return `Минимальная ставка — ${limits.minStake} USDT`;
  }

  if (value > limits.maxStake) {
    return `Максимальная ставка — ${limits.maxStake} USDT`;
  }

  if (balance !== null && value > balance + 0.001) {
    return `Недостаточно средств: доступно ${formatPrice(balance)} USDT`;
  }

  return null;
}

function pairLabel(pairId: MarketPairId) {
  const pair = getMarketPair(pairId);
  return pair ? `${pair.base}/USDT` : pairId.toUpperCase();
}

const pairGlyphs: Record<MarketPairId, string> = {
  btc: "₿",
  eth: "Ξ",
  sol: "◎",
};

const pairAccents: Record<MarketPairId, string> = {
  btc: "bg-amber-400/10 text-amber-300 ring-amber-400/25",
  eth: "bg-indigo-400/10 text-indigo-300 ring-indigo-400/25",
  sol: "bg-violet-400/10 text-violet-300 ring-violet-400/25",
};

function PairBadge({ pairId }: { pairId: MarketPairId }) {
  return (
    <span
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-1",
        pairAccents[pairId]
      )}
    >
      {pairGlyphs[pairId]}
    </span>
  );
}

function PairSwitcher({
  pairId,
  quotes,
  onChange,
}: {
  pairId: MarketPairId;
  quotes: Partial<Record<MarketPairId, MarketQuote>>;
  onChange: (pairId: MarketPairId) => void;
}) {
  const activePair = getMarketPair(pairId) ?? marketPairs[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Выбрать торговую пару"
        className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] pr-2 pl-1 text-xs font-semibold text-foreground transition-colors outline-none hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-emerald-400/40"
      >
        <PairBadge pairId={activePair.id} />
        {activePair.base}/USDT
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52 border border-white/10 bg-[#0a0f0d] p-1"
      >
        {marketPairs.map((item) => {
          const snapshot = quotes[item.id]?.snapshot;
          const itemPositive = (snapshot?.change ?? 0) >= 0;

          return (
            <DropdownMenuItem
              key={item.id}
              onClick={() => onChange(item.id)}
              className={cn(
                "gap-2 rounded-md px-1.5 py-1.5 focus:bg-white/5",
                item.id === pairId && "bg-white/5"
              )}
            >
              <PairBadge pairId={item.id} />
              <span className="flex-1 text-xs font-medium">
                {item.base}/USDT
              </span>
              <span
                className={cn(
                  "font-mono text-[10px]",
                  snapshot
                    ? itemPositive
                      ? "text-emerald-400"
                      : "text-rose-400"
                    : "text-muted-foreground"
                )}
              >
                {snapshot ? formatChange(snapshot.change) : "—"}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function QuoteStatus({
  hasSnapshot,
  hasError,
}: {
  hasSnapshot: boolean;
  hasError: boolean;
}) {
  if (hasSnapshot && !hasError) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-emerald-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        Live
      </span>
    );
  }

  if (hasSnapshot && hasError) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-amber-300">
        <WifiOff className="h-2.5 w-2.5" />
        Нет связи
      </span>
    );
  }

  if (hasError) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-rose-400/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-rose-300">
        <WifiOff className="h-2.5 w-2.5" />
        Офлайн
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
      <Loader2 className="h-2.5 w-2.5 animate-spin" />
      Загрузка
    </span>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex h-full flex-col justify-center gap-3 px-4">
      <Skeleton className="h-3 w-1/4 bg-white/10" />
      <Skeleton className="h-24 w-full bg-white/10" />
      <Skeleton className="h-3 w-1/3 bg-white/10" />
    </div>
  );
}

function ChartError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-400/10 text-rose-300 ring-1 ring-rose-400/25">
        <WifiOff className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs font-medium text-foreground">
          Котировки недоступны
        </p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
          {message}. Попробуйте обновить данные.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="xs"
        onClick={onRetry}
        className="mt-1 border-white/15 bg-white/[0.03] text-foreground hover:bg-white/10"
      >
        <RefreshCw className="h-3 w-3" />
        Повторить
      </Button>
    </div>
  );
}

function StaleQuotesNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-3 mt-1 mb-2 flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-2.5 py-1.5">
      <WifiOff className="h-3 w-3 shrink-0 text-amber-300" />
      <span className="flex-1 text-[10px] leading-tight text-amber-100/80">
        Нет связи с Binance. Показываем последние данные.
      </span>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={onRetry}
        className="h-6 px-1.5 text-[10px] text-amber-200 hover:bg-amber-400/10 hover:text-amber-100"
      >
        Обновить
      </Button>
    </div>
  );
}

function ExpirySelector({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (minutes: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 gap-1">
      {expiryOptions.map((option) => {
        const isActive = option.minutes === value;

        return (
          <Button
            key={option.minutes}
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => onChange(option.minutes)}
            className={cn(
              "h-7 min-w-0 flex-1 rounded-full border px-1 text-[10px]",
              isActive
                ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15"
                : "border-white/10 bg-white/[0.02] text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}

function ActiveTradeRow({ trade, now }: { trade: PublicTrade; now: number }) {
  const isUp = trade.direction === "up";
  const DirectionIcon = isUp ? ArrowUp : ArrowDown;
  const remainingMs = Math.max(0, Date.parse(trade.expiresAt) - now);
  const settling = remainingMs <= 0;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-2 py-1.5",
        isUp
          ? "border-emerald-400/20 bg-emerald-400/[0.04]"
          : "border-rose-400/20 bg-rose-400/[0.04]"
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1",
          isUp
            ? "bg-emerald-400/10 text-emerald-400 ring-emerald-400/25"
            : "bg-rose-400/10 text-rose-400 ring-rose-400/25"
        )}
      >
        <DirectionIcon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold text-foreground">
          {pairLabel(trade.pairId)} ·{" "}
          {tradeDirectionLabels[trade.direction].toUpperCase()}
        </p>
        <p className="truncate text-[9px] text-muted-foreground">
          {formatAmount(trade.stake)} USDT · {trade.expiryMinutes} мин · вход{" "}
          {formatPrice(trade.entryPrice)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={cn(
            "font-mono text-xs font-semibold",
            isUp ? "text-emerald-400" : "text-rose-400"
          )}
        >
          {settling ? (
            <Loader2 className="inline h-3 w-3 animate-spin" />
          ) : (
            formatDuration(remainingMs)
          )}
        </p>
        <p className="text-[8px] uppercase tracking-[0.08em] text-muted-foreground">
          до {formatTime(Date.parse(trade.expiresAt))}
        </p>
      </div>
    </div>
  );
}

function ActiveTradesPanel({
  trades,
  now,
}: {
  trades: PublicTrade[];
  now: number;
}) {
  return (
    <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/[0.08] duration-500">
      <CardContent className="space-y-1.5 px-2.5 py-2">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            <Timer className="h-3 w-3" />
            Активные сделки
          </span>
          <span className="font-mono text-[9px] text-muted-foreground">
            {trades.length}/{maxActiveTrades}
          </span>
        </div>
        <div className="max-h-24 space-y-1 overflow-y-auto pr-0.5">
          {trades.map((trade) => (
            <ActiveTradeRow key={trade.id} trade={trade} now={now} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TradeResultCard({ trade }: { trade: PublicTrade }) {
  const won = trade.status === "won";
  const ResultIcon = won ? TrendingUp : TrendingDown;

  return (
    <Card
      className={cn(
        "animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 duration-500",
        won ? "ring-emerald-400/30" : "ring-rose-400/30"
      )}
    >
      <CardContent className="space-y-2.5 px-4 py-3">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
              won
                ? "bg-emerald-400/10 text-emerald-300"
                : "bg-rose-400/10 text-rose-300"
            )}
          >
            {won ? "Выигрыш" : "Проигрыш"}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Сделка закрыта
          </span>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1",
                won
                  ? "bg-emerald-400/10 text-emerald-400 ring-emerald-400/25"
                  : "bg-rose-400/10 text-rose-400 ring-rose-400/25"
              )}
            >
              <ResultIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {pairLabel(trade.pairId)} ·{" "}
                {tradeDirectionLabels[trade.direction].toUpperCase()}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Вход {formatPrice(trade.entryPrice)}
                {trade.exitPrice !== null
                  ? ` → выход ${formatPrice(trade.exitPrice)}`
                  : ""}
              </p>
            </div>
          </div>
          <p
            className={cn(
              "shrink-0 font-mono text-lg font-semibold",
              won ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {won ? "+" : "-"}
            {formatAmount(won ? trade.profit : trade.stake)}
            <span className="ml-1 text-[10px] font-medium">USDT</span>
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-white/5 pt-2 text-[10px] text-muted-foreground">
          <span>
            Ставка {formatAmount(trade.stake)} USDT · {trade.expiryMinutes} мин
          </span>
          <span>
            {won
              ? `Выплата ${formatAmount(trade.payout)} USDT`
              : "Результат учтён в балансе"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function TradingTerminal() {
  const [pairId, setPairId] = useState<MarketPairId>("btc");
  const [timeframe, setTimeframe] = useState<MarketTimeframeId>(
    defaultMarketTimeframe
  );
  const [stakeInput, setStakeInput] = useState<string>(defaultStakeInput);
  const [expiry, setExpiry] = useState<number>(expiryOptions[0].minutes);
  const [stakeTouched, setStakeTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const { quote, quotes, retry } = useMarketQuotes(pairId, timeframe);
  const {
    account,
    limits,
    activeTrades,
    latestTrade,
    isLoading,
    isPlacing,
    error,
    settledTrade,
    clearSettledTrade,
    placeTrade,
    refresh,
  } = useTrading();

  const pair = getMarketPair(pairId) ?? marketPairs[0];
  const snapshot = quote.snapshot;
  const positive = (snapshot?.change ?? 0) >= 0;
  const ChangeIcon = positive ? TrendingUp : TrendingDown;
  const hasError = Boolean(quote.error);
  const hasSnapshot = Boolean(snapshot);
  const stakeError = stakeTouched
    ? getStakeError(stakeInput, account?.balance ?? null, limits)
    : null;
  const displayError = formError ?? stakeError;
  const hasActiveTrades = activeTrades.length > 0;
  const activeLimitReached = activeTrades.length >= maxActiveTrades;
  const chartTrade =
    activeTrades.find((trade) => trade.pairId === pair.id) ?? null;
  const resultTrade =
    !hasActiveTrades && latestTrade && latestTrade.status !== "open"
      ? latestTrade
      : null;
  const directionsDisabled = isLoading || isPlacing || activeLimitReached;

  useEffect(() => {
    if (!settledTrade) {
      return;
    }

    if (settledTrade.status === "won") {
      toast.success(
        `Сделка закрыта: +${formatAmount(settledTrade.profit)} USDT`
      );
    } else {
      toast.error(`Сделка закрыта: -${formatAmount(settledTrade.stake)} USDT`);
    }

    clearSettledTrade();
  }, [settledTrade, clearSettledTrade]);

  useEffect(() => {
    if (!hasActiveTrades) {
      return;
    }

    const initialTick = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), 1_000);

    return () => {
      clearTimeout(initialTick);
      clearInterval(timer);
    };
  }, [hasActiveTrades]);

  const handleStakeChange = (value: string) => {
    setStakeInput(value);
    setFormError(null);
  };

  const handleStakeFactor = (factor: number) => {
    const current = parseStake(stakeInput);

    if (!Number.isFinite(current) || current <= 0) {
      return;
    }

    const next = Math.min(
      limits.maxStake,
      Math.max(limits.minStake, roundMoney(current * factor))
    );

    setStakeInput(String(next));
    setStakeTouched(false);
    setFormError(null);
  };

  const handleChooseDirection = async (direction: TradeDirection) => {
    setStakeTouched(true);

    if (isPlacing) {
      return;
    }

    if (activeLimitReached) {
      toast.error(
        `Достигнут лимит ${maxActiveTrades} активных сделок. Дождитесь завершения одной из них.`
      );
      return;
    }

    const problem = getStakeError(stakeInput, account?.balance ?? null, limits);

    if (problem) {
      setFormError(problem);
      toast.error(problem);
      return;
    }

    const parsed = createTradeSchema.safeParse({
      pairId: pair.id,
      direction,
      stake: roundMoney(parseStake(stakeInput)),
      expiryMinutes: expiry,
    });

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Проверьте параметры ставки";
      setFormError(message);
      toast.error(message);
      return;
    }

    setFormError(null);

    const result = await placeTrade(parsed.data);

    if (!result.ok) {
      setFormError(result.message);
      toast.error(result.message);
      return;
    }

    setStakeTouched(false);
    toast.success("Ставка принята");
  };

  const handleRetry = () => {
    retry();
    void refresh();
  };

  const balanceHint =
    account !== null
      ? `Доступно ${formatPrice(account.balance)} USDT · лимит ${limits.minStake}–${limits.maxStake}`
      : `Лимит ${limits.minStake}–${limits.maxStake} USDT`;

  return (
    <div className="relative h-[calc(100dvh-6rem)] overflow-hidden bg-[#050807]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% -5%, rgba(16,185,129,0.14), transparent 45%), radial-gradient(circle at 85% 8%, rgba(56,189,248,0.07), transparent 35%)",
        }}
      />
      <div className="relative mx-auto flex h-full w-full max-w-md flex-col gap-2 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="animate-in fade-in slide-in-from-bottom-4 flex items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-[#0a0f0d] px-2.5 py-1.5 duration-500">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/25">
              <Wallet className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-[8px] uppercase tracking-[0.16em] text-muted-foreground">
                <span
                  className={cn(
                    "h-1 w-1 rounded-full",
                    error
                      ? "bg-amber-400"
                      : account
                        ? "bg-emerald-400"
                        : "bg-muted-foreground/50"
                  )}
                />
                Баланс
              </p>
              <p className="truncate font-mono text-sm font-semibold leading-tight text-foreground">
                {account ? (
                  formatPrice(account.balance)
                ) : isLoading ? (
                  <Skeleton className="inline-block h-4 w-20 bg-white/10 align-middle" />
                ) : (
                  "—"
                )}{" "}
                <span className="text-[9px] font-medium text-emerald-400">
                  USDT
                </span>
              </p>
            </div>
          </div>
          <PairSwitcher pairId={pair.id} quotes={quotes} onChange={setPairId} />
        </div>

        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-2.5 py-1">
            <WifiOff className="h-3 w-3 shrink-0 text-amber-300" />
            <span className="flex-1 truncate text-[9px] leading-tight text-amber-100/80">
              {error}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={handleRetry}
              className="h-5 px-1 text-[9px] text-amber-200 hover:bg-amber-400/10 hover:text-amber-100"
            >
              Повторить
            </Button>
          </div>
        ) : null}

        <Card className="animate-in fade-in slide-in-from-bottom-4 flex min-h-0 flex-1 flex-col gap-0 rounded-xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/[0.08] duration-500">
          <CardContent className="flex min-h-0 flex-1 flex-col px-0 py-0">
            <div className="flex items-start justify-between gap-2 px-3 pt-2.5 pb-1">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-1.5">
                  {snapshot ? (
                    <p className="font-mono text-[26px] font-semibold leading-none tracking-tight text-foreground">
                      {formatPrice(snapshot.price)}
                    </p>
                  ) : (
                    <Skeleton className="h-7 w-32 bg-white/10" />
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    USDT
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[9px] text-muted-foreground">
                  {snapshot ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-1 py-0.5 font-mono",
                        positive
                          ? "bg-emerald-400/10 text-emerald-400"
                          : "bg-rose-400/10 text-rose-400"
                      )}
                    >
                      <ChangeIcon className="h-2.5 w-2.5" />
                      {formatChange(snapshot.change)}
                    </span>
                  ) : (
                    <Skeleton className="h-4 w-12 bg-white/10" />
                  )}
                  <span className="truncate">
                    24ч{" "}
                    <span className="font-mono text-foreground/70">
                      {snapshot ? formatPrice(snapshot.low) : "—"}
                    </span>
                    {" – "}
                    <span className="font-mono text-foreground/70">
                      {snapshot ? formatPrice(snapshot.high) : "—"}
                    </span>
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <QuoteStatus hasSnapshot={hasSnapshot} hasError={hasError} />
                <span className="font-mono text-[9px] text-muted-foreground">
                  {snapshot ? formatTime(snapshot.updatedAt) : "—"}
                </span>
              </div>
            </div>

            <div
              className="flex items-center gap-1 px-3 pb-1"
              role="group"
              aria-label="Таймфрейм графика"
            >
              {marketTimeframeIds.map((item) => {
                const isActive = item === timeframe;

                return (
                  <Button
                    key={item}
                    type="button"
                    variant="ghost"
                    size="xs"
                    aria-pressed={isActive}
                    onClick={() => setTimeframe(item)}
                    className={cn(
                      "h-5 rounded px-1.5 font-mono text-[9px] font-semibold",
                      isActive
                        ? "bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/20"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )}
                  >
                    {marketTimeframeLabels[item]}
                  </Button>
                );
              })}
            </div>

            <div className="relative min-h-0 flex-1">
              {snapshot ? (
                <PriceChart
                  candles={snapshot.candles}
                  positive={positive}
                  trade={chartTrade}
                  timeframe={snapshot.timeframe}
                  ariaLabel={`График ${pair.base}/USDT`}
                  className="h-full"
                />
              ) : quote.error ? (
                <ChartError message={quote.error} onRetry={retry} />
              ) : (
                <ChartSkeleton />
              )}
            </div>

            {snapshot && quote.error ? (
              <StaleQuotesNotice onRetry={retry} />
            ) : null}
          </CardContent>
        </Card>

        {hasActiveTrades ? (
          <ActiveTradesPanel trades={activeTrades} now={now} />
        ) : null}

        <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/[0.08] duration-500">
          <CardContent className="space-y-1.5 px-2.5 py-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPlacing}
                onClick={() => handleStakeFactor(0.5)}
                aria-label="Разделить сумму на 2"
                className="h-9 w-10 shrink-0 rounded-lg border-white/10 bg-white/[0.02] font-mono text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground"
              >
                ÷2
              </Button>
              <div className="relative min-w-0 flex-1">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={stakeInput}
                  onChange={(event) => handleStakeChange(event.target.value)}
                  onBlur={() => setStakeTouched(true)}
                  aria-label="Сумма ставки"
                  title={balanceHint}
                  className={cn(
                    "h-9 rounded-lg border-white/10 bg-white/[0.03] px-7 text-center font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-emerald-400/40",
                    displayError && "border-rose-400/50"
                  )}
                />
                <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[8px] uppercase tracking-[0.08em] text-muted-foreground">
                  USDT
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={isPlacing}
                onClick={() => handleStakeFactor(2)}
                aria-label="Умножить сумму на 2"
                className="h-9 w-10 shrink-0 rounded-lg border-white/10 bg-white/[0.02] font-mono text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground"
              >
                x2
              </Button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-10 shrink-0 text-[8px] uppercase tracking-[0.14em] text-muted-foreground">
                Время
              </span>
              <ExpirySelector
                value={expiry}
                onChange={setExpiry}
                disabled={isPlacing}
              />
            </div>

            {displayError ? (
              <p className="px-1 text-[9px] leading-tight text-rose-300">
                {displayError}
              </p>
            ) : null}
          </CardContent>
        </Card>

        {resultTrade ? <TradeResultCard trade={resultTrade} /> : null}

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            disabled={directionsDisabled}
            onClick={() => handleChooseDirection("up")}
            className="h-12 gap-2 rounded-xl border border-emerald-300/30 bg-emerald-500 text-emerald-950 shadow-[0_0_30px_-12px_rgba(16,185,129,0.9)] hover:bg-emerald-400 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowUp className="h-4 w-4" />
            <span className="text-sm font-bold uppercase tracking-[0.08em]">
              Вверх
            </span>
            <span className="text-[9px] font-semibold opacity-70">
              +{payoutRate}%
            </span>
          </Button>
          <Button
            type="button"
            disabled={directionsDisabled}
            onClick={() => handleChooseDirection("down")}
            className="h-12 gap-2 rounded-xl border border-rose-300/30 bg-rose-500 text-rose-950 shadow-[0_0_30px_-12px_rgba(244,63,94,0.9)] hover:bg-rose-400 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowDown className="h-4 w-4" />
            <span className="text-sm font-bold uppercase tracking-[0.08em]">
              Вниз
            </span>
            <span className="text-[9px] font-semibold opacity-70">
              +{payoutRate}%
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
