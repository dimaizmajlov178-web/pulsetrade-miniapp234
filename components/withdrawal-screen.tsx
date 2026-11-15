"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpFromLine,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  History,
  Landmark,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Wallet,
  WifiOff,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useWithdrawals } from "@/hooks/use-withdrawals";
import { formatUsdt, roundMoney } from "@/lib/trading";
import {
  withdrawalMethods,
  withdrawalMethodLabels,
  withdrawalStatusLabels,
  type PublicWithdrawal,
  type WithdrawalLimits,
  type WithdrawalMethod,
  type WithdrawalStatus,
} from "@/lib/withdrawals";
import { createWithdrawalSchema } from "@/lib/validation/withdrawal";
import { cn } from "@/lib/utils";

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const statusStyles: Record<
  WithdrawalStatus,
  { badge: string; icon: string; amount: string }
> = {
  pending: {
    badge: "bg-amber-400/10 text-amber-300",
    icon: "bg-amber-400/10 text-amber-300 ring-amber-400/25",
    amount: "text-amber-300",
  },
  paid: {
    badge: "bg-emerald-400/10 text-emerald-300",
    icon: "bg-emerald-400/10 text-emerald-400 ring-emerald-400/25",
    amount: "text-emerald-400",
  },
  rejected: {
    badge: "bg-rose-400/10 text-rose-300",
    icon: "bg-rose-400/10 text-rose-400 ring-rose-400/25",
    amount: "text-rose-400",
  },
};

const methodIcons: Record<WithdrawalMethod, typeof Wallet> = {
  usdt: Wallet,
  sbp: Landmark,
};

function parseAmount(raw: string) {
  return Number(raw.replace(",", ".").trim());
}

function getAmountError(
  raw: string,
  limits: WithdrawalLimits,
  availableBalance: number
): string | null {
  if (!raw.trim()) {
    return "Введите сумму вывода";
  }

  const value = parseAmount(raw);

  if (!Number.isFinite(value) || value <= 0) {
    return "Введите сумму числом";
  }

  if (value < limits.minAmount) {
    return `Минимальная сумма — ${limits.minAmount} USDT`;
  }

  if (value > limits.maxAmount) {
    return `Максимальная сумма — ${formatUsdt(limits.maxAmount)} USDT`;
  }

  if (value > availableBalance + 0.001) {
    return `Недостаточно средств: доступно ${formatUsdt(availableBalance)} USDT`;
  }

  return null;
}

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function maskValue(value: string) {
  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 6)}…${value.slice(-6)}`;
}

function getDetailsSummary(withdrawal: PublicWithdrawal) {
  if (withdrawal.method === "usdt") {
    return withdrawal.address
      ? `Адрес ${maskValue(withdrawal.address)}`
      : "Адрес USDT";
  }

  const phone = withdrawal.phone ?? "телефон не указан";
  const recipient = withdrawal.recipient ? ` · ${withdrawal.recipient}` : "";

  return `${phone}${recipient}`;
}

function StatusBadge({ status }: { status: WithdrawalStatus }) {
  const styles = statusStyles[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
        styles.badge
      )}
    >
      {status === "pending" ? (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      ) : status === "paid" ? (
        <CheckCircle2 className="h-2.5 w-2.5" />
      ) : (
        <XCircle className="h-2.5 w-2.5" />
      )}
      {withdrawalStatusLabels[status]}
    </span>
  );
}

function WithdrawalRow({ withdrawal }: { withdrawal: PublicWithdrawal }) {
  const styles = statusStyles[withdrawal.status];
  const MethodIcon = methodIcons[withdrawal.method];

  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1",
            styles.icon
          )}
        >
          <MethodIcon className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-semibold text-foreground">
              Вывод {withdrawalMethodLabels[withdrawal.method]}
            </p>
            <StatusBadge status={withdrawal.status} />
          </div>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {formatDateTime(withdrawal.createdAt)} ·{" "}
            {getDetailsSummary(withdrawal)}
          </p>
          {withdrawal.processedAt ? (
            <p className="text-[10px] text-muted-foreground">
              Обработано {formatDateTime(withdrawal.processedAt)}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              Обрабатывается вручную
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className={cn("font-mono text-xs font-semibold", styles.amount)}>
            -{formatUsdt(withdrawal.amount)}
          </p>
          <p className="text-[9px] text-muted-foreground">USDT</p>
        </div>
      </div>

      {withdrawal.status === "rejected" && withdrawal.rejectionReason ? (
        <div className="mt-2 rounded-lg border border-rose-400/20 bg-rose-400/5 px-2.5 py-2">
          <p className="text-[9px] uppercase tracking-[0.14em] text-rose-300/80">
            Причина отклонения
          </p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-rose-100/80">
            {withdrawal.rejectionReason}
          </p>
        </div>
      ) : null}
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
      <p className="text-xs text-muted-foreground">Заявок на вывод пока нет</p>
      <p className="text-[10px] leading-relaxed text-muted-foreground/70">
        Создайте заявку — она появится здесь со статусом обработки.
      </p>
    </div>
  );
}

function MethodIcon({
  method,
  active,
}: {
  method: WithdrawalMethod;
  active: boolean;
}) {
  const Icon = method === "usdt" ? Wallet : Smartphone;

  return (
    <span
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md ring-1",
        active
          ? "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25"
          : "bg-white/5 text-muted-foreground ring-white/10"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}

export function WithdrawalScreen() {
  const {
    account,
    withdrawals,
    limits,
    availableBalance,
    isLoading,
    isSubmitting,
    error,
    createWithdrawal,
    refresh,
  } = useWithdrawals();
  const [method, setMethod] = useState<WithdrawalMethod>("usdt");
  const [amountInput, setAmountInput] = useState(
    String(limits.presets[0] ?? limits.minAmount)
  );
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amountTouched, setAmountTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const amountValue = parseAmount(amountInput);
  const amountError = amountTouched
    ? getAmountError(amountInput, limits, availableBalance)
    : null;
  const displayError = formError ?? amountError;
  const showBalanceSkeleton = !account && isLoading;
  const showHistorySkeleton = isLoading && withdrawals.length === 0;

  const handleMethodChange = (nextMethod: WithdrawalMethod) => {
    setMethod(nextMethod);
    setFormError(null);
  };

  const handlePreset = (amount: number) => {
    setAmountInput(String(amount));
    setAmountTouched(false);
    setFormError(null);
  };

  const handleSubmit = async () => {
    setAmountTouched(true);

    const amountProblem = getAmountError(amountInput, limits, availableBalance);

    if (amountProblem) {
      setFormError(amountProblem);
      toast.error(amountProblem);
      return;
    }

    const amount = roundMoney(parseAmount(amountInput));
    const payload =
      method === "usdt"
        ? { method, amount, address }
        : { method, amount, phone, recipient };
    const parsed = createWithdrawalSchema.safeParse(payload);

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Проверьте реквизиты для вывода";
      setFormError(message);
      toast.error(message);
      return;
    }

    const result = await createWithdrawal(parsed.data);

    if (!result.ok) {
      setFormError(result.message);
      toast.error(result.message);
      return;
    }

    setFormError(null);
    setAmountTouched(false);
    setAmountInput(String(limits.presets[0] ?? limits.minAmount));
    toast.success("Заявка на вывод создана");
  };

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
        <Link
          href="/wallet"
          className="inline-flex w-fit items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />К балансу
        </Link>

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
          <CardContent className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/25">
                <ArrowUpFromLine className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Общий баланс
                </p>
                <p className="font-mono text-xl font-semibold leading-tight text-foreground">
                  {account ? (
                    formatUsdt(account.balance)
                  ) : showBalanceSkeleton ? (
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
                Доступно
              </p>
              <p className="font-mono text-[11px] text-emerald-400">
                {account ? formatUsdt(availableBalance) : "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10 duration-500">
          <CardContent className="space-y-3 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Заявка на вывод
              </p>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-emerald-300">
                <ShieldCheck className="h-2.5 w-2.5" />
                Ручная выплата
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {withdrawalMethods.map((item) => {
                const isActive = item === method;

                return (
                  <Button
                    key={item}
                    type="button"
                    variant="outline"
                    onClick={() => handleMethodChange(item)}
                    className={cn(
                      "h-11 justify-start gap-2 rounded-lg border px-3 text-xs font-semibold",
                      isActive
                        ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15"
                        : "border-white/10 bg-white/[0.02] text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )}
                  >
                    <MethodIcon method={item} active={isActive} />
                    {withdrawalMethodLabels[item]}
                  </Button>
                );
              })}
            </div>

            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                value={amountInput}
                onChange={(event) => {
                  setAmountInput(event.target.value);
                  setFormError(null);
                }}
                onBlur={() => setAmountTouched(true)}
                aria-label="Сумма вывода"
                className={cn(
                  "h-11 rounded-lg border-white/10 bg-white/[0.02] pr-14 font-mono text-base text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-emerald-400/40",
                  displayError && "border-rose-400/50"
                )}
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                USDT
              </span>
            </div>

            <p
              className={cn(
                "text-[10px] leading-tight",
                displayError ? "text-rose-300" : "text-muted-foreground"
              )}
            >
              {displayError ??
                `Доступно ${formatUsdt(availableBalance)} USDT · от ${limits.minAmount} до ${formatUsdt(limits.maxAmount)}`}
            </p>

            <div className="grid grid-cols-4 gap-2">
              {limits.presets.map((amount) => {
                const isActive = amount === amountValue;

                return (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    onClick={() => handlePreset(amount)}
                    className={cn(
                      "h-8 rounded-lg border font-mono text-xs",
                      isActive
                        ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15"
                        : "border-white/10 bg-white/[0.02] text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )}
                  >
                    {amount}
                  </Button>
                );
              })}
            </div>

            {method === "usdt" ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    Адрес USDT (TON)
                  </span>
                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                    TON
                  </span>
                </div>
                <Input
                  type="text"
                  value={address}
                  onChange={(event) => {
                    setAddress(event.target.value);
                    setFormError(null);
                  }}
                  placeholder="UQ..."
                  aria-label="Адрес USDT в сети TON"
                  className="h-10 rounded-lg border-white/10 bg-white/[0.02] font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-emerald-400/40"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    Телефон для СБП
                  </span>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value);
                      setFormError(null);
                    }}
                    placeholder="+7 900 000-00-00"
                    aria-label="Телефон для СБП"
                    className="h-10 rounded-lg border-white/10 bg-white/[0.02] font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-emerald-400/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    Получатель
                  </span>
                  <Input
                    type="text"
                    value={recipient}
                    onChange={(event) => {
                      setRecipient(event.target.value);
                      setFormError(null);
                    }}
                    placeholder="ФИО получателя"
                    aria-label="Получатель перевода по СБП"
                    className="h-10 rounded-lg border-white/10 bg-white/[0.02] text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-emerald-400/40"
                  />
                </div>
              </div>
            )}

            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting || !account}
              className="h-11 w-full rounded-lg bg-emerald-500 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpFromLine className="h-4 w-4" />
              )}
              Отправить заявку
            </Button>

            <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
              Выплаты выполняются вручную администратором. После отправки заявка
              получит статус «На обработке».
            </p>
          </CardContent>
        </Card>

        <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10 duration-500">
          <CardContent className="px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                История выводов
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <History className="h-3 w-3" />
                {isLoading && withdrawals.length === 0
                  ? "…"
                  : withdrawals.length}
              </span>
            </div>
            <Separator className="bg-white/10" />
            {showHistorySkeleton ? (
              <HistorySkeleton />
            ) : withdrawals.length === 0 ? (
              <EmptyHistory />
            ) : (
              <div className="divide-y divide-white/5 pt-1">
                {withdrawals.map((withdrawal) => (
                  <WithdrawalRow key={withdrawal.id} withdrawal={withdrawal} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
          <Clock3 className="h-3 w-3 text-amber-300" />
          Ручная обработка · без автовыплат
        </div>
      </div>
    </div>
  );
}
