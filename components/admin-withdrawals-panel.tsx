"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ChevronLeft,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Landmark,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Wallet,
  WifiOff,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminRole } from "@/lib/admin";
import {
  type AdminWithdrawalResult,
  useAdminWithdrawals,
} from "@/hooks/use-admin-withdrawals";
import { formatUsdt } from "@/lib/trading";
import {
  withdrawalMethodLabels,
  withdrawalStatusLabels,
  withdrawalTypeLabels,
  type AdminWithdrawal,
  type WithdrawalStatus,
} from "@/lib/withdrawals";
import {
  withdrawalDecisionSchema,
  type WithdrawalDecisionInput,
} from "@/lib/validation/withdrawal";
import { cn } from "@/lib/utils";

type Filter = "pending" | "all";

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
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

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
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

function Requisites({ withdrawal }: { withdrawal: AdminWithdrawal }) {
  if (withdrawal.method === "usdt") {
    return (
      <div className="space-y-1">
        <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          Реквизиты · USDT (TON)
        </p>
        <p className="break-all font-mono text-[10px] leading-relaxed text-foreground/90">
          {withdrawal.address ?? "Адрес не указан"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
        Реквизиты · СБП
      </p>
      <p className="font-mono text-[10px] leading-relaxed text-foreground/90">
        {withdrawal.phone ?? "Телефон не указан"}
      </p>
      <p className="text-[10px] leading-relaxed text-foreground/80">
        Получатель: {withdrawal.recipient ?? "не указан"}
      </p>
    </div>
  );
}

function WithdrawalCard({
  withdrawal,
  isProcessing,
  canManage,
  onDecide,
}: {
  withdrawal: AdminWithdrawal;
  isProcessing: boolean;
  canManage: boolean;
  onDecide: (
    decision: WithdrawalDecisionInput
  ) => Promise<AdminWithdrawalResult>;
}) {
  const [isRejecting, setIsRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const styles = statusStyles[withdrawal.status];
  const MethodIcon = withdrawal.method === "usdt" ? Wallet : Landmark;
  const isPending = withdrawal.status === "pending";

  const handlePay = async () => {
    const result = await onDecide({ action: "pay" });

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success("Заявка отмечена как «Выплачено»");
  };

  const handleReject = async () => {
    const parsed = withdrawalDecisionSchema.safeParse({
      action: "reject",
      reason,
    });

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Укажите причину отклонения";
      setReasonError(message);
      toast.error(message);
      return;
    }

    const result = await onDecide(parsed.data);

    if (!result.ok) {
      setReasonError(result.message);
      toast.error(result.message);
      return;
    }

    setIsRejecting(false);
    setReason("");
    setReasonError(null);
    toast.success("Заявка отклонена");
  };

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10 duration-300">
      <CardContent className="space-y-3 px-4 py-3">
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
              {withdrawal.type === "referral" ? (
                <span className="rounded-md bg-indigo-400/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-indigo-300">
                  {withdrawalTypeLabels.referral}
                </span>
              ) : null}
              <StatusBadge status={withdrawal.status} />
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground">
              <span className="font-mono">UID {withdrawal.uid}</span>
              <span aria-hidden>·</span>
              <span>{formatDateTime(withdrawal.createdAt)}</span>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className={cn("font-mono text-sm font-semibold", styles.amount)}>
              {formatUsdt(withdrawal.amount)}
            </p>
            <p className="text-[9px] text-muted-foreground">USDT</p>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
          <Requisites withdrawal={withdrawal} />
        </div>

        {withdrawal.status === "rejected" && withdrawal.rejectionReason ? (
          <div className="rounded-lg border border-rose-400/20 bg-rose-400/5 px-2.5 py-2">
            <p className="text-[9px] uppercase tracking-[0.14em] text-rose-300/80">
              Причина отклонения
            </p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-rose-100/80">
              {withdrawal.rejectionReason}
            </p>
          </div>
        ) : null}

        {withdrawal.processedAt ? (
          <p className="text-[10px] text-muted-foreground">
            Обработано {formatDateTime(withdrawal.processedAt)}
          </p>
        ) : null}

        {isPending && !canManage ? (
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2">
            <p className="text-[10px] leading-relaxed text-amber-100/80">
              Ваша роль позволяет просматривать заявку, но не обрабатывать
              выплаты.
            </p>
          </div>
        ) : isPending ? (
          isRejecting ? (
            <div className="space-y-2 rounded-xl border border-rose-400/20 bg-rose-400/[0.03] px-3 py-2.5">
              <label
                htmlFor={`reason-${withdrawal.id}`}
                className="text-[9px] uppercase tracking-[0.14em] text-rose-300/80"
              >
                Причина отклонения (обязательно)
              </label>
              <textarea
                id={`reason-${withdrawal.id}`}
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  setReasonError(null);
                }}
                rows={3}
                maxLength={300}
                placeholder="Например: неверные реквизиты"
                className={cn(
                  "w-full resize-none rounded-lg border bg-white/[0.02] px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40",
                  reasonError ? "border-rose-400/50" : "border-white/10"
                )}
              />
              <p
                className={cn(
                  "text-[10px] leading-tight",
                  reasonError ? "text-rose-300" : "text-muted-foreground"
                )}
              >
                {reasonError ??
                  "Причина станет видна пользователю в его приложении."}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsRejecting(false);
                    setReason("");
                    setReasonError(null);
                  }}
                  disabled={isProcessing}
                  className="h-9 border-white/10 bg-white/[0.02] text-foreground hover:bg-white/5"
                >
                  Отмена
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleReject()}
                  disabled={isProcessing || reason.trim().length < 2}
                  className="h-9 bg-rose-500 text-rose-50 hover:bg-rose-400"
                >
                  {isProcessing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  Отклонить
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                onClick={() => void handlePay()}
                disabled={isProcessing}
                className="h-10 bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Выплачено
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRejecting(true)}
                disabled={isProcessing}
                className="h-10 border-rose-400/30 bg-rose-400/5 text-rose-300 hover:bg-rose-400/10 hover:text-rose-200"
              >
                <XCircle className="h-4 w-4" />
                Отклонить
              </Button>
            </div>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card className="gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10">
      <CardContent className="space-y-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl bg-white/10" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-2/3 bg-white/10" />
            <Skeleton className="h-2.5 w-1/2 bg-white/10" />
          </div>
          <Skeleton className="h-4 w-14 bg-white/10" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl bg-white/10" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-10 w-full rounded-lg bg-white/10" />
          <Skeleton className="h-10 w-full rounded-lg bg-white/10" />
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-muted-foreground ring-1 ring-white/10">
        <ClipboardList className="h-4 w-4" />
      </div>
      <p className="text-xs text-muted-foreground">Заявок пока нет</p>
      <p className="text-[10px] leading-relaxed text-muted-foreground/70">
        Новые заявки на вывод появятся здесь автоматически.
      </p>
    </div>
  );
}

export function AdminWithdrawalsPanel({
  role = "owner",
  canManageWithdrawals = true,
  embedded = false,
}: {
  role?: AdminRole;
  canManageWithdrawals?: boolean;
  embedded?: boolean;
}) {
  const { withdrawals, isLoading, processingId, error, refresh, decide } =
    useAdminWithdrawals(role);
  const [filter, setFilter] = useState<Filter>("pending");

  const pending = withdrawals.filter(
    (withdrawal) => withdrawal.status === "pending"
  );
  const paidCount = withdrawals.filter(
    (withdrawal) => withdrawal.status === "paid"
  ).length;
  const rejectedCount = withdrawals.filter(
    (withdrawal) => withdrawal.status === "rejected"
  ).length;
  const pendingAmount = pending.reduce(
    (total, withdrawal) => total + withdrawal.amount,
    0
  );
  const ordered =
    filter === "pending"
      ? pending
      : [...withdrawals].sort((left, right) => {
          if (left.status === "pending" && right.status !== "pending") {
            return -1;
          }

          if (right.status === "pending" && left.status !== "pending") {
            return 1;
          }

          return Date.parse(right.createdAt) - Date.parse(left.createdAt);
        });
  const showSkeleton = isLoading && withdrawals.length === 0;

  return (
    <div className="relative min-h-[calc(100dvh-6rem)] overflow-hidden bg-[#050807]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% -5%, rgba(16,185,129,0.14), transparent 45%), radial-gradient(circle at 85% 8%, rgba(56,189,248,0.07), transparent 35%)",
        }}
      />
      <div className="relative mx-auto flex w-full flex-col gap-3 px-0 pb-1 pt-0">
        {embedded ? null : (
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />К терминалу
          </Link>
        )}

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

        {embedded ? null : (
          <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10 duration-500">
            <CardContent className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/25">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Панель сотрудника
                </p>
                <p className="text-base font-semibold leading-tight text-foreground">
                  Заявки на вывод
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Ручная выплата или отклонение с причиной
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Card className="gap-0 rounded-xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-amber-400/20">
            <CardContent className="px-3 py-2.5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                На обработке
              </p>
              <p className="font-mono text-lg font-semibold leading-tight text-amber-300">
                {pending.length}
              </p>
              <p className="font-mono text-[9px] text-muted-foreground">
                {formatUsdt(pendingAmount)} USDT
              </p>
            </CardContent>
          </Card>
          <Card className="gap-0 rounded-xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-emerald-400/20">
            <CardContent className="px-3 py-2.5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                Выплачено
              </p>
              <p className="font-mono text-lg font-semibold leading-tight text-emerald-400">
                {paidCount}
              </p>
              <p className="text-[9px] text-muted-foreground">заявок</p>
            </CardContent>
          </Card>
          <Card className="gap-0 rounded-xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-rose-400/20">
            <CardContent className="px-3 py-2.5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                Отклонено
              </p>
              <p className="font-mono text-lg font-semibold leading-tight text-rose-400">
                {rejectedCount}
              </p>
              <p className="text-[9px] text-muted-foreground">заявок</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setFilter("pending")}
            className={cn(
              "h-9 rounded-lg border text-xs font-semibold",
              filter === "pending"
                ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15"
                : "border-white/10 bg-white/[0.02] text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}
          >
            <Clock3 className="h-3.5 w-3.5" />
            На обработке
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setFilter("all")}
            className={cn(
              "h-9 rounded-lg border text-xs font-semibold",
              filter === "all"
                ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15"
                : "border-white/10 bg-white/[0.02] text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Все заявки
          </Button>
        </div>

        {showSkeleton ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : ordered.length === 0 ? (
          <Card className="gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10">
            <CardContent className="px-4 py-3">
              <EmptyState />
            </CardContent>
          </Card>
        ) : (
          ordered.map((withdrawal) => (
            <WithdrawalCard
              key={withdrawal.id}
              withdrawal={withdrawal}
              isProcessing={processingId === withdrawal.id}
              canManage={canManageWithdrawals}
              onDecide={(decision) => decide(withdrawal.id, decision)}
            />
          ))
        )}

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
          <Clock3 className="h-3 w-3 text-amber-300" />
          Выплаты только вручную · без автовыплат
        </div>

        <Separator className="bg-white/5" />
        <p className="text-center text-[10px] leading-relaxed text-muted-foreground/70">
          Отклонение возможно только с причиной — пользователь увидит её в
          истории выводов.
        </p>
      </div>
    </div>
  );
}
