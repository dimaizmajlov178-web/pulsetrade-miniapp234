"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  History,
  RefreshCw,
  UserRound,
  Users,
  Wallet,
  WifiOff,
} from "lucide-react";

import { ReferralPanel } from "@/components/referral-panel";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrading } from "@/hooks/use-trading";
import { getMarketPair } from "@/lib/market-data";
import {
  formatUsdt,
  tradeDirectionLabels,
  type PublicTrade,
  type TradeStatus,
} from "@/lib/trading";
import { cn } from "@/lib/utils";

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const statusConfig: Record<
  TradeStatus,
  { label: string; badgeClassName: string; amountClassName: string }
> = {
  open: {
    label: "В игре",
    badgeClassName: "bg-amber-400/10 text-amber-300",
    amountClassName: "text-amber-300",
  },
  won: {
    label: "Выигрыш",
    badgeClassName: "bg-emerald-400/10 text-emerald-300",
    amountClassName: "text-emerald-400",
  },
  lost: {
    label: "Проигрыш",
    badgeClassName: "bg-rose-400/10 text-rose-300",
    amountClassName: "text-rose-400",
  },
};

function pairLabel(trade: PublicTrade) {
  const pair = getMarketPair(trade.pairId);
  return pair ? `${pair.base}/USDT` : trade.symbol;
}

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function TradeRow({ trade }: { trade: PublicTrade }) {
  const isUp = trade.direction === "up";
  const DirectionIcon = isUp ? ArrowUp : ArrowDown;
  const status = statusConfig[trade.status];
  const amount =
    trade.status === "won"
      ? `+${formatUsdt(trade.profit)}`
      : trade.status === "lost"
        ? `-${formatUsdt(trade.stake)}`
        : null;

  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1",
          isUp
            ? "bg-emerald-400/10 text-emerald-400 ring-emerald-400/25"
            : "bg-rose-400/10 text-rose-400 ring-rose-400/25"
        )}
      >
        <DirectionIcon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-semibold text-foreground">
            {pairLabel(trade)}
          </p>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
              isUp
                ? "bg-emerald-400/10 text-emerald-300"
                : "bg-rose-400/10 text-rose-300"
            )}
          >
            {tradeDirectionLabels[trade.direction]}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          Ставка {formatUsdt(trade.stake)} USDT · {trade.expiryMinutes} мин
        </p>
        <p className="text-[10px] text-muted-foreground">
          Экспирация {formatDateTime(trade.expiresAt)}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <span
          className={cn(
            "inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
            status.badgeClassName
          )}
        >
          {status.label}
        </span>
        <p
          className={cn(
            "mt-1 font-mono text-xs font-semibold",
            amount ? status.amountClassName : "text-muted-foreground"
          )}
        >
          {amount ? `${amount} USDT` : "ожидание"}
        </p>
      </div>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-3 py-3">
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl bg-white/10" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-2/3 bg-white/10" />
            <Skeleton className="h-2.5 w-1/2 bg-white/10" />
          </div>
          <Skeleton className="h-3 w-12 bg-white/10" />
        </div>
      ))}
    </div>
  );
}

function EmptyHistory() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-muted-foreground ring-1 ring-white/10">
        <History className="h-4 w-4" />
      </div>
      <p className="text-xs text-muted-foreground">История ставок пока пуста</p>
      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: "outline", size: "xs" }),
          "mt-1 border-white/15 bg-white/[0.03] text-foreground hover:bg-white/10"
        )}
      >
        К терминалу
      </Link>
    </div>
  );
}

type ProfileTab = "history" | "referrals";

export function ProfileScreen() {
  const { account, trades, isLoading, error, refresh } = useTrading();
  const [tab, setTab] = useState<ProfileTab>("history");
  const showAccountSkeleton = !account && isLoading;
  const showHistorySkeleton = isLoading && trades.length === 0;

  return (
    <div className="relative min-h-[calc(100dvh-6rem)] overflow-hidden bg-[#050807]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% -5%, rgba(16,185,129,0.14), transparent 45%), radial-gradient(circle at 85% 8%, rgba(56,189,248,0.07), transparent 35%)",
        }}
      />
      <div className="relative mx-auto flex w-full max-w-md flex-col gap-3 px-3 pb-6 pt-3">
        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-2.5 py-1.5">
            <WifiOff className="h-3 w-3 shrink-0 text-amber-300" />
            <span className="flex-1 text-[10px] leading-tight text-amber-100/80">
              {error}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => void refresh()}
              className="h-6 px-1.5 text-[10px] text-amber-200 hover:bg-amber-400/10 hover:text-amber-100"
            >
              <RefreshCw className="h-3 w-3" />
              Повторить
            </Button>
          </div>
        ) : null}

        <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10 duration-500">
          <CardContent className="px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/25">
                <UserRound className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Ваш UID
                </p>
                <p className="font-mono text-2xl font-semibold leading-tight tracking-wide text-foreground">
                  {showAccountSkeleton ? (
                    <Skeleton className="inline-block h-7 w-28 bg-white/10 align-middle" />
                  ) : (
                    (account?.uid ?? "—")
                  )}
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                  Сообщите UID при обращении в поддержку или администратору.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10 duration-500">
          <CardContent className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/25">
                <Wallet className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Общий баланс
                </p>
                <p className="font-mono text-xl font-semibold leading-tight text-foreground">
                  {account ? (
                    formatUsdt(account.balance)
                  ) : showAccountSkeleton ? (
                    <Skeleton className="inline-block h-6 w-24 bg-white/10 align-middle" />
                  ) : (
                    "—"
                  )}{" "}
                  <span className="text-[11px] font-medium text-emerald-400">
                    USDT
                  </span>
                </p>
              </div>
            </div>
            <div className="shrink-0 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-right">
              <p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Счёт
              </p>
              <p
                className={cn(
                  "font-mono text-[11px]",
                  error
                    ? "text-amber-300"
                    : account
                      ? "text-emerald-400"
                      : "text-muted-foreground"
                )}
              >
                {error ? "нет связи" : account ? "активен" : "загрузка"}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1">
          <button
            type="button"
            onClick={() => setTab("history")}
            aria-pressed={tab === "history"}
            className={cn(
              "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[11px] font-semibold transition-colors",
              tab === "history"
                ? "bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/25"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}
          >
            <History className="h-3.5 w-3.5" />
            История
          </button>
          <button
            type="button"
            onClick={() => setTab("referrals")}
            aria-pressed={tab === "referrals"}
            className={cn(
              "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[11px] font-semibold transition-colors",
              tab === "referrals"
                ? "bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/25"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            Рефералы
          </button>
        </div>

        {tab === "history" ? (
          <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10 duration-500">
            <CardContent className="px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  История ставок
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <History className="h-3 w-3" />
                  {isLoading && trades.length === 0 ? "…" : trades.length}
                </span>
              </div>
              <Separator className="bg-white/10" />
              {showHistorySkeleton ? (
                <HistorySkeleton />
              ) : trades.length === 0 ? (
                <EmptyHistory />
              ) : (
                <div className="divide-y divide-white/5">
                  {trades.map((trade) => (
                    <TradeRow key={trade.id} trade={trade} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <ReferralPanel />
        )}
      </div>
    </div>
  );
}
