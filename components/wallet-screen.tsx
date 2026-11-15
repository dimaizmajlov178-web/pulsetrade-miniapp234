"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  Gift,
  History,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Wallet,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

import { PromoBonusCard } from "@/components/promo-bonus-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeposits } from "@/hooks/use-deposits";
import { usePromo } from "@/hooks/use-promo";
import {
  depositStatusLabels,
  type DepositLimits,
  type DepositStatus,
  type PublicDeposit,
} from "@/lib/deposits";
import type { PublicBonusActivation } from "@/lib/promo";
import { formatUsdt, roundMoney } from "@/lib/trading";
import { createDepositSchema } from "@/lib/validation/deposit";
import { cn } from "@/lib/utils";

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const statusStyles: Record<
  DepositStatus,
  { badge: string; icon: string; amount: string }
> = {
  pending: {
    badge: "bg-amber-400/10 text-amber-300",
    icon: "bg-amber-400/10 text-amber-300 ring-amber-400/25",
    amount: "text-amber-300",
  },
  completed: {
    badge: "bg-emerald-400/10 text-emerald-300",
    icon: "bg-emerald-400/10 text-emerald-400 ring-emerald-400/25",
    amount: "text-emerald-400",
  },
  expired: {
    badge: "bg-white/5 text-muted-foreground",
    icon: "bg-white/5 text-muted-foreground ring-white/10",
    amount: "text-muted-foreground",
  },
  failed: {
    badge: "bg-rose-400/10 text-rose-300",
    icon: "bg-rose-400/10 text-rose-400 ring-rose-400/25",
    amount: "text-rose-400",
  },
};

function parseAmount(raw: string) {
  return Number(raw.replace(",", ".").trim());
}

function getAmountError(raw: string, limits: DepositLimits): string | null {
  if (!raw.trim()) {
    return "Введите сумму пополнения";
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

  return null;
}

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function isExternalLink(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

function StatusBadge({ status }: { status: DepositStatus }) {
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
      ) : null}
      {depositStatusLabels[status]}
    </span>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} скопирован`);
    } catch {
      toast.error("Не удалось скопировать");
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={handleCopy}
      className="shrink-0 text-muted-foreground hover:bg-white/5 hover:text-foreground"
      aria-label={`Скопировать ${label.toLowerCase()}`}
    >
      <Copy className="h-3.5 w-3.5" />
    </Button>
  );
}

function DepositRow({
  deposit,
  active,
  onSelect,
}: {
  deposit: PublicDeposit;
  active: boolean;
  onSelect: () => void;
}) {
  const styles = statusStyles[deposit.status];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl px-2 py-3 text-left transition-colors first:pt-2 last:pb-2",
        active ? "bg-white/[0.04]" : "hover:bg-white/[0.03]"
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1",
          styles.icon
        )}
      >
        <ArrowDownToLine className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-semibold text-foreground">
            Пополнение USDT
          </p>
          <StatusBadge status={deposit.status} />
        </div>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {formatDateTime(deposit.createdAt)} · TON
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className={cn("font-mono text-xs font-semibold", styles.amount)}>
          +{formatUsdt(deposit.amount)}
        </p>
        <p className="text-[9px] text-muted-foreground">USDT</p>
      </div>
    </button>
  );
}

function BonusRow({ activation }: { activation: PublicBonusActivation }) {
  const completed = activation.status === "completed";

  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/25">
        <Gift className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-semibold text-foreground">
            Бонус по промокоду
          </p>
          <span
            className={cn(
              "inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
              completed
                ? "bg-emerald-400/10 text-emerald-300"
                : "bg-amber-400/10 text-amber-300"
            )}
          >
            {completed ? "Отыгран" : "В отыгрыше"}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {activation.code} · {formatDateTime(activation.createdAt)}
        </p>
        {!completed ? (
          <p className="text-[10px] text-muted-foreground">
            Отыгрыш {activation.progressPercent}%
          </p>
        ) : null}
      </div>

      <div className="shrink-0 text-right">
        <p className="font-mono text-xs font-semibold text-emerald-400">
          +{formatUsdt(activation.bonusAmount)}
        </p>
        <p className="text-[9px] text-muted-foreground">USDT</p>
      </div>
    </div>
  );
}

function DepositDetails({
  deposit,
  isChecking,
  onCheck,
  onClose,
}: {
  deposit: PublicDeposit;
  isChecking: boolean;
  onCheck: () => void;
  onClose: () => void;
}) {
  const external = isExternalLink(deposit.paymentLink);

  return (
    <Card
      className={cn(
        "animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 duration-300",
        deposit.status === "pending"
          ? "ring-amber-400/30"
          : deposit.status === "completed"
            ? "ring-emerald-400/30"
            : "ring-white/10"
      )}
    >
      <CardContent className="space-y-3 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Детали пополнения
          </p>
          <StatusBadge status={deposit.status} />
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-2xl font-semibold leading-none text-foreground">
              {formatUsdt(deposit.amount)}
              <span className="ml-1.5 text-[11px] font-medium text-emerald-400">
                USDT
              </span>
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Сеть TON · зачисление в общий баланс
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              Создано
            </p>
            <p className="font-mono text-[10px] text-foreground/80">
              {formatDateTime(deposit.createdAt)}
            </p>
          </div>
        </div>

        {deposit.status === "pending" ? (
          <>
            <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-amber-200">
                <Clock3 className="h-3 w-3" />
                Ожидаем подтверждение платежа
              </div>

              {deposit.address ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                      Адрес USDT (TON)
                    </span>
                    <CopyButton value={deposit.address} label="Адрес" />
                  </div>
                  <p className="break-all font-mono text-[10px] leading-relaxed text-foreground/90">
                    {deposit.address}
                  </p>
                  {deposit.memo ? (
                    <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-1.5">
                      <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                        Комментарий
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-[10px] text-foreground/90">
                          {deposit.memo}
                        </span>
                        <CopyButton value={deposit.memo} label="Комментарий" />
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-1.5">
                <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  Ссылка на оплату
                </span>
                <div className="flex items-center gap-1">
                  <span className="max-w-[150px] truncate font-mono text-[10px] text-foreground/70">
                    {external ? "Платёжный шлюз" : "Открыть счёт"}
                  </span>
                  {external ? (
                    <a
                      href={deposit.paymentLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 hover:text-emerald-300"
                      aria-label="Открыть ссылку на оплату"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <Link
                      href={deposit.paymentLink}
                      className="text-emerald-400 hover:text-emerald-300"
                      aria-label="Открыть счёт на оплату"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Счёт действует до {formatDateTime(deposit.expiresAt)}. После
              оплаты нажмите «Проверить оплату» — баланс обновится
              автоматически.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {external ? (
                <a
                  href={deposit.paymentLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-400"
                >
                  <ExternalLink className="h-4 w-4" />К оплате
                </a>
              ) : (
                <Link
                  href={deposit.paymentLink}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-400"
                >
                  <ArrowDownToLine className="h-4 w-4" />К оплате
                </Link>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={onCheck}
                disabled={isChecking}
                className="h-10 border-white/10 bg-white/[0.02] text-foreground hover:bg-white/5"
              >
                {isChecking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Проверить
              </Button>
            </div>
          </>
        ) : deposit.status === "completed" ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/25">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-emerald-200">
                Средства зачислены на баланс
              </p>
              <p className="mt-0.5 text-[10px] text-emerald-100/60">
                {deposit.confirmedAt
                  ? `Подтверждено ${formatDateTime(deposit.confirmedAt)}`
                  : "Платёж подтверждён"}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
            <p className="text-xs font-medium text-foreground">
              {deposit.status === "expired"
                ? "Счёт истёк"
                : "Платёж не был обработан"}
            </p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
              Создайте новый счёт на пополнение, чтобы продолжить.
            </p>
          </div>
        )}

        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={onClose}
          className="w-full text-muted-foreground hover:bg-white/5 hover:text-foreground"
        >
          Скрыть детали
        </Button>
      </CardContent>
    </Card>
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
      <p className="text-xs text-muted-foreground">Операций пока нет</p>
      <p className="text-[10px] leading-relaxed text-muted-foreground/70">
        Пополнения и бонусы появятся здесь со статусом и датой.
      </p>
    </div>
  );
}

type OperationItem =
  | { kind: "deposit"; createdAt: string; deposit: PublicDeposit }
  | {
      kind: "bonus";
      createdAt: string;
      activation: PublicBonusActivation;
    };

export function WalletScreen() {
  const {
    account,
    deposits,
    limits,
    isLoading,
    isCreating,
    checkingId,
    error,
    createDeposit,
    checkDeposit,
    refresh,
  } = useDeposits();
  const {
    activations: bonusActivations,
    wageringPercent,
    isLoading: isPromoLoading,
    isActivating: isPromoActivating,
    error: promoError,
    activate: activatePromo,
    refresh: refreshPromo,
  } = usePromo();
  const [amountInput, setAmountInput] = useState(
    String(limits.presets[1] ?? limits.minAmount)
  );
  const [amountTouched, setAmountTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dismissedPendingId, setDismissedPendingId] = useState<string | null>(
    null
  );
  const [autoCheckId, setAutoCheckId] = useState<string | null>(null);
  const previousStatusRef = useRef<DepositStatus | null>(null);

  const amountValue = parseAmount(amountInput);
  const amountError = amountTouched
    ? getAmountError(amountInput, limits)
    : null;
  const displayError = formError ?? amountError;
  const pendingDeposit =
    deposits.find(
      (deposit) =>
        deposit.status === "pending" && deposit.id !== dismissedPendingId
    ) ?? null;
  const selected = selectedId
    ? (deposits.find((deposit) => deposit.id === selectedId) ?? null)
    : pendingDeposit;
  const showBalanceSkeleton = !account && isLoading;
  const operations = useMemo(() => {
    const items: OperationItem[] = [
      ...deposits.map((deposit) => ({
        kind: "deposit" as const,
        createdAt: deposit.createdAt,
        deposit,
      })),
      ...bonusActivations.map((activation) => ({
        kind: "bonus" as const,
        createdAt: activation.createdAt,
        activation,
      })),
    ];

    return items.sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)
    );
  }, [deposits, bonusActivations]);
  const showHistorySkeleton =
    (isLoading || isPromoLoading) && operations.length === 0;
  const activeCount = deposits.filter(
    (deposit) => deposit.status === "pending"
  ).length;

  useEffect(() => {
    if (!selected) {
      previousStatusRef.current = null;
      return;
    }

    const previousStatus = previousStatusRef.current;

    if (previousStatus === "pending" && selected.status === "completed") {
      toast.success(`Баланс пополнен на ${formatUsdt(selected.amount)} USDT`);
    }

    previousStatusRef.current = selected.status;
  }, [selected]);

  useEffect(() => {
    if (!autoCheckId) {
      return;
    }

    const deposit = deposits.find((item) => item.id === autoCheckId);

    if (!deposit || deposit.status !== "pending") {
      return;
    }

    const timer = setInterval(() => {
      void checkDeposit(autoCheckId);
    }, 3_000);

    return () => clearInterval(timer);
  }, [autoCheckId, deposits, checkDeposit]);

  const handlePreset = (amount: number) => {
    setAmountInput(String(amount));
    setAmountTouched(false);
    setFormError(null);
  };

  const handleCreate = async () => {
    setAmountTouched(true);
    setAutoCheckId(null);
    previousStatusRef.current = null;

    const problem = getAmountError(amountInput, limits);

    if (problem) {
      setFormError(problem);
      toast.error(problem);
      return;
    }

    const parsed = createDepositSchema.safeParse({
      amount: roundMoney(parseAmount(amountInput)),
    });

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Проверьте сумму пополнения";
      setFormError(message);
      toast.error(message);
      return;
    }

    const result = await createDeposit(parsed.data.amount);

    if (!result.ok) {
      setFormError(result.message);
      toast.error(result.message);
      return;
    }

    setFormError(null);
    setAmountTouched(false);
    setSelectedId(result.deposit.id);
    setDismissedPendingId(null);
    toast.success("Счёт на пополнение создан");
  };

  const handleCheck = async () => {
    if (!selected) {
      return;
    }

    setAutoCheckId(selected.id);
    const result = await checkDeposit(selected.id);

    if (!result.ok) {
      setAutoCheckId(null);
      toast.error(result.message);
      return;
    }

    if (result.deposit.status === "pending") {
      toast("Платёж ещё не подтверждён", {
        description: "Проверяем поступление в сети TON.",
      });
    }
  };

  const handleRefresh = () => {
    void refresh();
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
              onClick={handleRefresh}
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
                <Wallet className="h-4 w-4" />
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
                Пополнение
              </p>
              <p
                className={cn(
                  "font-mono text-[11px]",
                  error
                    ? "text-amber-300"
                    : activeCount > 0
                      ? "text-amber-300"
                      : "text-emerald-400"
                )}
              >
                {error ? "нет связи" : activeCount > 0 ? "ожидание" : "TON"}
              </p>
            </div>
          </CardContent>
        </Card>

        <PromoBonusCard
          activations={bonusActivations}
          wageringPercent={wageringPercent}
          isLoading={isPromoLoading}
          isActivating={isPromoActivating}
          error={promoError}
          onActivate={async (input) => {
            const result = await activatePromo(input);

            if (result.ok) {
              void refresh();
            }

            return result;
          }}
          onRefresh={() => void refreshPromo()}
        />

        <Link href="/wallet/withdraw" className="group block">
          <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10 transition-colors duration-500 hover:bg-[#0d1411]">
            <CardContent className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/25">
                  <ArrowUpFromLine className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Вывод средств
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    USDT или СБП · обработка вручную
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </CardContent>
          </Card>
        </Link>

        <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10 duration-500">
          <CardContent className="space-y-3 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Сумма пополнения
              </p>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-emerald-300">
                <ShieldCheck className="h-2.5 w-2.5" />
                USDT · TON
              </span>
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
                aria-label="Сумма пополнения"
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
                `От ${limits.minAmount} до ${formatUsdt(limits.maxAmount)} USDT`}
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

            <Button
              type="button"
              onClick={handleCreate}
              disabled={isCreating}
              className="h-11 w-full rounded-lg bg-emerald-500 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowDownToLine className="h-4 w-4" />
              )}
              Получить реквизиты
            </Button>

            <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
              Оплата криптовалютой USDT в сети TON. Средства зачисляются после
              подтверждения платежа.
            </p>
          </CardContent>
        </Card>

        {selected ? (
          <DepositDetails
            deposit={selected}
            isChecking={checkingId === selected.id}
            onCheck={() => void handleCheck()}
            onClose={() => {
              setSelectedId(null);
              setDismissedPendingId(selected.id);
            }}
          />
        ) : null}

        <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10 duration-500">
          <CardContent className="px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                История операций
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <History className="h-3 w-3" />
                {showHistorySkeleton ? "…" : operations.length}
              </span>
            </div>
            <Separator className="bg-white/10" />
            {showHistorySkeleton ? (
              <HistorySkeleton />
            ) : operations.length === 0 ? (
              <EmptyHistory />
            ) : (
              <div className="divide-y divide-white/5 pt-1">
                {operations.map((operation) =>
                  operation.kind === "deposit" ? (
                    <DepositRow
                      key={`deposit-${operation.deposit.id}`}
                      deposit={operation.deposit}
                      active={operation.deposit.id === selected?.id}
                      onSelect={() => {
                        setSelectedId(operation.deposit.id);
                        setDismissedPendingId(null);
                      }}
                    />
                  ) : (
                    <BonusRow
                      key={`bonus-${operation.activation.id}`}
                      activation={operation.activation}
                    />
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
          <Check className="h-3 w-3 text-emerald-400" />
          Расчёты в USDT · сеть TON
        </div>
      </div>
    </div>
  );
}
