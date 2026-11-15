"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Coins,
  History,
  Loader2,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  UserRound,
  Wallet,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminUsers } from "@/hooks/use-admin-users";
import type {
  AdminOperation,
  AdminRole,
  AdminUserDetail,
  AdminUserSummary,
} from "@/lib/admin";
import { formatUsdt } from "@/lib/trading";
import { adminBalanceAdjustmentSchema } from "@/lib/validation/admin";
import { cn } from "@/lib/utils";

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDateTime(value: string) {
  if (!value) {
    return "—";
  }

  return dateTimeFormatter.format(new Date(value));
}

function parseAmount(raw: string) {
  return Number(raw.replace(",", ".").trim());
}

function UserSummaryCard({
  user,
  onSelect,
}: {
  user: AdminUserSummary;
  onSelect: (uid: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(user.uid)}
      className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-left transition-colors hover:border-emerald-400/30 hover:bg-emerald-400/[0.04]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-muted-foreground ring-1 ring-white/10">
            <UserRound className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold text-foreground">
              UID {user.uid}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Всего {formatUsdt(user.totalBalance)} USDT
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-[10px] text-emerald-400">
            R {formatUsdt(user.realBalance)}
          </p>
          <p className="font-mono text-[10px] text-sky-300">
            D {formatUsdt(user.demoBalance)}
          </p>
        </div>
      </div>
    </button>
  );
}

function BalanceCard({ detail }: { detail: AdminUserDetail }) {
  const { user } = detail;

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2.5">
        <p className="text-[9px] uppercase tracking-[0.14em] text-emerald-200/70">
          Реальные средства
        </p>
        <p className="mt-0.5 font-mono text-lg font-semibold text-emerald-400">
          {formatUsdt(user.realBalance)}
        </p>
        <p className="text-[9px] text-muted-foreground">USDT</p>
      </div>
      <div className="rounded-xl border border-sky-400/20 bg-sky-400/5 px-3 py-2.5">
        <p className="text-[9px] uppercase tracking-[0.14em] text-sky-200/70">
          Демо-средства
        </p>
        <p className="mt-0.5 font-mono text-lg font-semibold text-sky-300">
          {formatUsdt(user.demoBalance)}
        </p>
        <p className="text-[9px] text-muted-foreground">USDT</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
        <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          Общий баланс
        </p>
        <p className="font-mono text-sm font-semibold text-foreground">
          {formatUsdt(user.totalBalance)} USDT
        </p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
        <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          Зарезервировано
        </p>
        <p className="font-mono text-sm font-semibold text-amber-300">
          {formatUsdt(user.withdrawalReserved)} USDT
        </p>
      </div>
    </div>
  );
}

function OperationRow({ operation }: { operation: AdminOperation }) {
  const isOutgoing = operation.type === "withdrawal";
  const Icon = operation.type === "deposit" ? Wallet : Coins;

  return (
    <div className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1",
          isOutgoing
            ? "bg-rose-400/10 text-rose-300 ring-rose-400/20"
            : "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20"
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-foreground">
          {operation.title}
        </p>
        <p className="text-[9px] text-muted-foreground">
          {formatDateTime(operation.createdAt)} · {operation.statusLabel}
        </p>
        {operation.details ? (
          <p className="mt-0.5 text-[9px] text-muted-foreground/80">
            {operation.details}
          </p>
        ) : null}
      </div>
      <p
        className={cn(
          "shrink-0 font-mono text-xs font-semibold",
          isOutgoing ? "text-rose-300" : "text-emerald-400"
        )}
      >
        {isOutgoing ? "-" : "+"}
        {formatUsdt(operation.amount)}
      </p>
    </div>
  );
}

function TradeRow({
  trade,
}: {
  trade: AdminUserDetail["trades"][number];
}) {
  const isUp = trade.direction === "up";
  const Icon = isUp ? ArrowUp : ArrowDown;
  const result =
    trade.status === "won"
      ? "Выигрыш"
      : trade.status === "lost"
        ? "Проигрыш"
        : "В игре";

  return (
    <div className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0">
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1",
          isUp
            ? "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20"
            : "bg-rose-400/10 text-rose-300 ring-rose-400/20"
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-foreground">
          {trade.symbol} · {isUp ? "Вверх" : "Вниз"}
        </p>
        <p className="text-[9px] text-muted-foreground">
          {formatDateTime(trade.createdAt)} · {trade.expiryMinutes} мин ·{" "}
          {result}
        </p>
      </div>
      <p
        className={cn(
          "shrink-0 font-mono text-xs font-semibold",
          trade.status === "won"
            ? "text-emerald-400"
            : trade.status === "lost"
              ? "text-rose-300"
              : "text-amber-300"
        )}
      >
        {formatUsdt(trade.stake)}
      </p>
    </div>
  );
}

function BalanceAdjustmentForm({
  detail,
  isSubmitting,
  onSubmit,
}: {
  detail: AdminUserDetail;
  isSubmitting: boolean;
  onSubmit: (input: {
    demoDelta: number;
    realDelta: number;
    reason: string;
  }) => Promise<void>;
}) {
  const [demoDelta, setDemoDelta] = useState("");
  const [realDelta, setRealDelta] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const parsed = adminBalanceAdjustmentSchema.safeParse({
      demoDelta: demoDelta.trim() ? parseAmount(demoDelta) : 0,
      realDelta: realDelta.trim() ? parseAmount(realDelta) : 0,
      reason,
    });

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Проверьте данные корректировки";
      setFormError(message);
      toast.error(message);
      return;
    }

    if (
      detail.user.demoBalance + parsed.data.demoDelta < 0 ||
      detail.user.realBalance + parsed.data.realDelta < 0
    ) {
      const message = "Баланс не может стать отрицательным";
      setFormError(message);
      toast.error(message);
      return;
    }

    setFormError(null);
    await onSubmit(parsed.data);
    setDemoDelta("");
    setRealDelta("");
    setReason("");
  };

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
      <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
        Корректировка баланса
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <span className="text-[9px] text-muted-foreground">
            Демо, ± USDT
          </span>
          <Input
            type="text"
            inputMode="decimal"
            value={demoDelta}
            onChange={(event) => {
              setDemoDelta(event.target.value);
              setFormError(null);
            }}
            placeholder="0"
            aria-label="Изменение демо-баланса"
            className="h-9 rounded-lg border-white/10 bg-white/[0.02] font-mono text-xs text-foreground placeholder:text-muted-foreground/60"
          />
        </div>
        <div className="space-y-1">
          <span className="text-[9px] text-muted-foreground">
            Реальные, ± USDT
          </span>
          <Input
            type="text"
            inputMode="decimal"
            value={realDelta}
            onChange={(event) => {
              setRealDelta(event.target.value);
              setFormError(null);
            }}
            placeholder="0"
            aria-label="Изменение реального баланса"
            className="h-9 rounded-lg border-white/10 bg-white/[0.02] font-mono text-xs text-foreground placeholder:text-muted-foreground/60"
          />
        </div>
      </div>
      <Input
        type="text"
        value={reason}
        onChange={(event) => {
          setReason(event.target.value);
          setFormError(null);
        }}
        placeholder="Причина корректировки"
        aria-label="Причина корректировки"
        maxLength={200}
        className="h-9 rounded-lg border-white/10 bg-white/[0.02] text-xs text-foreground placeholder:text-muted-foreground/60"
      />
      {formError ? (
        <p className="text-[10px] text-rose-300">{formError}</p>
      ) : (
        <p className="text-[10px] text-muted-foreground">
          Положительное значение — начисление, отрицательное — списание.
          Действие попадёт в журнал.
        </p>
      )}
      <Button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={isSubmitting}
        className="h-9 w-full rounded-lg bg-emerald-500 text-xs font-semibold text-emerald-950 hover:bg-emerald-400"
      >
        {isSubmitting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Save className="h-3.5 w-3.5" />
        )}
        Применить корректировку
      </Button>
    </div>
  );
}

export function AdminUsersPanel({
  role,
  canAdjustBalances,
}: {
  role: AdminRole;
  canAdjustBalances: boolean;
}) {
  const {
    users,
    detail,
    isLoading,
    isSearching,
    isSubmitting,
    error,
    refresh,
    search,
    adjust,
  } = useAdminUsers(role);
  const [uidInput, setUidInput] = useState("");

  const handleSelect = async (uid: number) => {
    setUidInput(String(uid));
    const result = await search(uid);

    if (!result.ok) {
      toast.error(result.message);
    }
  };

  const handleSearch = async () => {
    const uid = Number(uidInput.trim());

    if (!Number.isInteger(uid) || uid <= 0) {
      toast.error("Введите UID числом");
      return;
    }

    const result = await search(uid);

    if (result.ok) {
      toast.success(`Найден UID ${uid}`);
    } else {
      toast.error(result.message);
    }
  };

  const handleAdjust = async (input: {
    demoDelta: number;
    realDelta: number;
    reason: string;
  }) => {
    if (!detail) {
      return;
    }

    const result = await adjust(detail.user.uid, input);

    if (result.ok) {
      toast.success("Баланс обновлён, действие в журнале");
    } else {
      toast.error(result.message);
    }
  };

  const showUsersSkeleton = isLoading && users.length === 0;

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

      <Card className="gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10">
        <CardContent className="space-y-2 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Поиск пользователя по UID
          </p>
          <div className="flex gap-2">
            <Input
              type="text"
              inputMode="numeric"
              value={uidInput}
              onChange={(event) => setUidInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleSearch();
                }
              }}
              placeholder="Например, 624839"
              aria-label="UID пользователя"
              className="h-10 rounded-lg border-white/10 bg-white/[0.02] font-mono text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-emerald-400/40"
            />
            <Button
              type="button"
              onClick={() => void handleSearch()}
              disabled={isSearching}
              className="h-10 shrink-0 rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-emerald-950 hover:bg-emerald-400"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Найти
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Баланс показывается раздельно: реальные и демо-средства.
          </p>
        </CardContent>
      </Card>

      {detail ? (
        <>
          <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10 duration-300">
            <CardContent className="space-y-3 px-4 py-3">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/25">
                  <UserRound className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                    Пользователь
                  </p>
                  <p className="font-mono text-xl font-semibold leading-tight text-foreground">
                    UID {detail.user.uid}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Создан {formatDateTime(detail.user.createdAt)}
                  </p>
                </div>
              </div>

              <BalanceCard detail={detail} />

              {canAdjustBalances ? (
                <BalanceAdjustmentForm
                  key={detail.user.uid}
                  detail={detail}
                  isSubmitting={isSubmitting}
                  onSubmit={handleAdjust}
                />
              ) : (
                <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                  <p className="text-[10px] leading-relaxed text-amber-100/80">
                    Ваша роль позволяет просматривать баланс, но не менять его.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10">
            <CardContent className="px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  История ставок
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <History className="h-3 w-3" />
                  {detail.trades.length}
                </span>
              </div>
              <Separator className="bg-white/10" />
              {detail.trades.length === 0 ? (
                <p className="py-4 text-center text-[10px] text-muted-foreground">
                  Ставок пока нет
                </p>
              ) : (
                <div className="divide-y divide-white/5 pt-1">
                  {detail.trades.map((trade) => (
                    <TradeRow key={trade.id} trade={trade} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10">
            <CardContent className="px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  История операций
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <History className="h-3 w-3" />
                  {detail.operations.length}
                </span>
              </div>
              <Separator className="bg-white/10" />
              {detail.operations.length === 0 ? (
                <p className="py-4 text-center text-[10px] text-muted-foreground">
                  Операций пока нет
                </p>
              ) : (
                <div className="divide-y divide-white/5 pt-1">
                  {detail.operations.map((operation) => (
                    <OperationRow key={operation.id} operation={operation} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10">
          <CardContent className="px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Недавние пользователи
              </p>
              <span className="text-[10px] text-muted-foreground">
                {users.length}
              </span>
            </div>
            {showUsersSkeleton ? (
              <div className="space-y-2 py-2">
                <Skeleton className="h-12 w-full rounded-xl bg-white/10" />
                <Skeleton className="h-12 w-full rounded-xl bg-white/10" />
              </div>
            ) : users.length === 0 ? (
              <p className="py-4 text-center text-[10px] text-muted-foreground">
                Пользователей пока нет
              </p>
            ) : (
              <div className="space-y-2 pt-1">
                {users.map((user) => (
                  <UserSummaryCard
                    key={user.id}
                    user={user}
                    onSelect={(uid) => void handleSelect(uid)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
