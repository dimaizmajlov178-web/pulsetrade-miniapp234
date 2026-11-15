"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Copy,
  HandCoins,
  Loader2,
  Percent,
  RefreshCw,
  Share2,
  Users,
  Wallet,
  WifiOff,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useReferrals } from "@/hooks/use-referrals";
import { formatUsdt } from "@/lib/trading";
import {
  withdrawalStatusLabels,
  type PublicWithdrawal,
  type WithdrawalStatus,
} from "@/lib/withdrawals";
import { createReferralWithdrawalSchema } from "@/lib/validation/referral";
import { cn } from "@/lib/utils";

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function parseAmount(raw: string) {
  return Number(raw.replace(",", ".").trim());
}

const withdrawalStatusStyles: Record<
  WithdrawalStatus,
  { badge: string; icon: string }
> = {
  pending: {
    badge: "bg-amber-400/10 text-amber-300",
    icon: "bg-amber-400/10 text-amber-300 ring-amber-400/25",
  },
  paid: {
    badge: "bg-emerald-400/10 text-emerald-300",
    icon: "bg-emerald-400/10 text-emerald-400 ring-emerald-400/25",
  },
  rejected: {
    badge: "bg-rose-400/10 text-rose-300",
    icon: "bg-rose-400/10 text-rose-400 ring-rose-400/25",
  },
};

function ReferralWithdrawalRow({
  withdrawal,
}: {
  withdrawal: PublicWithdrawal;
}) {
  const styles = withdrawalStatusStyles[withdrawal.status];
  const StatusIcon =
    withdrawal.status === "pending"
      ? Clock3
      : withdrawal.status === "paid"
        ? CheckCircle2
        : XCircle;

  return (
    <div className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1",
          styles.icon
        )}
      >
        <StatusIcon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-xs font-semibold text-foreground">
          {formatUsdt(withdrawal.amount)}{" "}
          <span className="text-[9px] font-medium text-muted-foreground">
            USDT
          </span>
        </p>
        <p className="text-[9px] text-muted-foreground">
          {formatDateTime(withdrawal.createdAt)}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
          styles.badge
        )}
      >
        {withdrawalStatusLabels[withdrawal.status]}
      </span>
    </div>
  );
}

function ReferralSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1].map((index) => (
        <Card
          key={index}
          className="gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10"
        >
          <CardContent className="space-y-2 px-4 py-3">
            <Skeleton className="h-3 w-1/3 bg-white/10" />
            <Skeleton className="h-9 w-full bg-white/10" />
            <Skeleton className="h-3 w-2/3 bg-white/10" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ReferralPanel() {
  const { referral, isLoading, isSubmitting, error, withdraw, refresh } =
    useReferrals();
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  const handleCopy = async () => {
    if (!referral) {
      return;
    }

    setCopying(true);

    try {
      await navigator.clipboard.writeText(referral.link);
      toast.success("Ссылка скопирована");
    } catch {
      toast.error("Не удалось скопировать ссылку");
    } finally {
      setCopying(false);
    }
  };

  const handleWithdraw = async () => {
    const parsedAmount = parseAmount(amount);
    const parsed = createReferralWithdrawalSchema.safeParse({
      amount: parsedAmount,
      address,
    });

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Проверьте данные заявки";
      setFormError(message);
      toast.error(message);
      return;
    }

    if (!referral || parsedAmount > referral.availableBalance + 0.001) {
      const message = "Недостаточно реферальных средств";
      setFormError(message);
      toast.error(message);
      return;
    }

    setFormError(null);
    const result = await withdraw(parsed.data);

    if (!result.ok) {
      setFormError(result.message);
      toast.error(result.message);
      return;
    }

    setAddress("");
    setAmount("");
    toast.success("Заявка на вывод реферальных создана");
  };

  if (isLoading && !referral) {
    return <ReferralSkeleton />;
  }

  if (!referral) {
    return (
      <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10 duration-500">
        <CardContent className="flex flex-col items-center gap-2 px-6 py-8 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-400/10 text-rose-300 ring-1 ring-rose-400/25">
            <WifiOff className="h-4 w-4" />
          </div>
          <p className="text-xs text-muted-foreground">
            {error ?? "Не удалось загрузить реферальные данные"}
          </p>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => void refresh()}
            className="mt-1 border-white/15 bg-white/[0.03] text-foreground hover:bg-white/10"
          >
            <RefreshCw className="h-3 w-3" />
            Повторить
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!referral.isInfluencer) {
    return (
      <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10 duration-500">
        <CardContent className="flex flex-col items-center gap-3 px-6 py-8 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/25">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Партнёрская программа
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Свяжитесь с поддержкой, чтобы стать партнером
            </p>
          </div>
          <Link
            href="/support"
            className={cn(
              buttonVariants({ variant: "outline", size: "xs" }),
              "border-white/15 bg-white/[0.03] text-foreground hover:bg-white/10"
            )}
          >
            Написать в поддержку
          </Link>
        </CardContent>
      </Card>
    );
  }

  const canWithdraw =
    referral.availableBalance + 0.001 >= referral.minWithdrawal;

  return (
    <div className="space-y-3">
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
        <CardContent className="space-y-2.5 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/25">
              <Share2 className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Ваша ссылка
              </p>
              <p className="text-[10px] text-muted-foreground">
                Приглашайте трейдеров и получайте процент с их пополнений
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={referral.link}
              aria-label="Реферальная ссылка"
              className="h-9 min-w-0 flex-1 rounded-lg border-white/10 bg-white/[0.03] font-mono text-[10px] text-foreground"
            />
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => void handleCopy()}
              disabled={copying}
              className="h-9 shrink-0 gap-1.5 border-white/15 bg-white/[0.03] text-foreground hover:bg-white/10"
            >
              {copying ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              Скопировать
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10 duration-500">
        <CardContent className="px-4 py-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-2 py-2">
              <Percent className="h-3.5 w-3.5 text-emerald-400" />
              <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                Процент
              </p>
              <p className="font-mono text-sm font-semibold text-foreground">
                {referral.rewardPercent}%
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-2 py-2">
              <Wallet className="h-3.5 w-3.5 text-emerald-400" />
              <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                Баланс
              </p>
              <p className="font-mono text-sm font-semibold text-foreground">
                {formatUsdt(referral.balance)}
              </p>
              <p className="text-[8px] text-muted-foreground">USDT</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-2 py-2">
              <Users className="h-3.5 w-3.5 text-emerald-400" />
              <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                Рефералы
              </p>
              <p className="font-mono text-sm font-semibold text-foreground">
                {referral.referralsCount}
              </p>
              <p className="text-[8px] text-muted-foreground">приглашено</p>
            </div>
          </div>
          <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">
            Реферальный баланс хранится отдельно от основного. Доступно к
            выводу: {formatUsdt(referral.availableBalance)} USDT.
          </p>
        </CardContent>
      </Card>

      <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10 duration-500">
        <CardContent className="space-y-2.5 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/25">
                <HandCoins className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Вывод реферальных
                </p>
                <p className="text-[9px] text-muted-foreground">
                  Минимум ${referral.minWithdrawal}, выплаты вручную
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() =>
                setAmount(
                  referral.availableBalance > 0
                    ? String(referral.availableBalance)
                    : ""
                )
              }
              className="h-6 px-1.5 text-[9px] text-emerald-300 hover:bg-emerald-400/10 hover:text-emerald-200"
            >
              Весь баланс
            </Button>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setFormError(null);
                }}
                placeholder={formatUsdt(referral.availableBalance)}
                aria-label="Сумма вывода реферальных"
                className="h-9 rounded-lg border-white/10 bg-white/[0.03] pr-12 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-emerald-400/40"
              />
              <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[8px] uppercase tracking-[0.08em] text-muted-foreground">
                USDT
              </span>
            </div>
            <Input
              type="text"
              value={address}
              onChange={(event) => {
                setAddress(event.target.value);
                setFormError(null);
              }}
              placeholder="Адрес USDT (TON)"
              aria-label="Адрес USDT для вывода реферальных"
              className="h-9 rounded-lg border-white/10 bg-white/[0.03] font-mono text-xs text-foreground placeholder:font-sans placeholder:text-muted-foreground/60 focus-visible:ring-emerald-400/40"
            />
          </div>

          {formError ? (
            <p className="text-[9px] leading-tight text-rose-300">
              {formError}
            </p>
          ) : null}

          {!canWithdraw ? (
            <p className="text-[9px] leading-tight text-amber-300/80">
              Для вывода нужно накопить минимум ${referral.minWithdrawal}.
            </p>
          ) : null}

          <Button
            type="button"
            onClick={() => void handleWithdraw()}
            disabled={isSubmitting || !canWithdraw}
            className="h-9 w-full gap-2 rounded-lg border border-emerald-300/30 bg-emerald-500 text-xs font-semibold text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <HandCoins className="h-3.5 w-3.5" />
            )}
            Вывести реферальные
          </Button>
        </CardContent>
      </Card>

      {referral.withdrawals.length > 0 ? (
        <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10 duration-500">
          <CardContent className="px-4 py-3">
            <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Заявки на вывод реферальных
            </p>
            <Separator className="mb-1 bg-white/10" />
            <div className="divide-y divide-white/5">
              {referral.withdrawals.slice(0, 5).map((withdrawal) => (
                <ReferralWithdrawalRow
                  key={withdrawal.id}
                  withdrawal={withdrawal}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
