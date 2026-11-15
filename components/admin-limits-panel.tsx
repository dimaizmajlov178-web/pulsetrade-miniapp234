"use client";

import { useState } from "react";
import {
  Loader2,
  RefreshCw,
  Save,
  ShieldAlert,
  SlidersHorizontal,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminSettings } from "@/hooks/use-admin-settings";
import type { AdminRole } from "@/lib/admin";
import { adminLimitsSchema } from "@/lib/validation/admin";

function parseAmount(raw: string) {
  return Number(raw.replace(",", ".").trim());
}

export function AdminLimitsPanel({
  role,
  canManageLimits,
}: {
  role: AdminRole;
  canManageLimits: boolean;
}) {
  const { limits, isLoading, isSubmitting, error, refresh, save } =
    useAdminSettings(role);
  const [minStake, setMinStake] = useState<string | null>(null);
  const [maxStake, setMaxStake] = useState<string | null>(null);
  const [withdrawalMin, setWithdrawalMin] = useState<string | null>(null);
  const [withdrawalMax, setWithdrawalMax] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const parsed = adminLimitsSchema.safeParse({
      minStake: parseAmount(minStake ?? String(limits?.minStake ?? "")),
      maxStake: parseAmount(maxStake ?? String(limits?.maxStake ?? "")),
      withdrawalMin: parseAmount(
        withdrawalMin ?? String(limits?.withdrawalMin ?? "")
      ),
      withdrawalMax: parseAmount(
        withdrawalMax ?? String(limits?.withdrawalMax ?? "")
      ),
    });

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Проверьте значения лимитов";
      setFormError(message);
      toast.error(message);
      return;
    }

    const result = await save(parsed.data);

    if (result.ok) {
      setFormError(null);
      setMinStake(null);
      setMaxStake(null);
      setWithdrawalMin(null);
      setWithdrawalMax(null);
      toast.success("Лимиты обновлены для новых ставок и заявок");
    } else {
      setFormError(result.message);
      toast.error(result.message);
    }
  };

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

      <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10 duration-300">
        <CardContent className="space-y-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/25">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Настройки платформы
              </p>
              <p className="text-sm font-semibold text-foreground">
                Лимиты ставок и вывода
              </p>
            </div>
          </div>

          {isLoading && !limits ? (
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-16 w-full rounded-xl bg-white/10" />
              <Skeleton className="h-16 w-full rounded-xl bg-white/10" />
              <Skeleton className="h-16 w-full rounded-xl bg-white/10" />
              <Skeleton className="h-16 w-full rounded-xl bg-white/10" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  Мин. ставка
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={
                    minStake ??
                    (limits ? String(limits.minStake) : "")
                  }
                  onChange={(event) => {
                    setMinStake(event.target.value);
                    setFormError(null);
                  }}
                  disabled={!canManageLimits}
                  aria-label="Минимальная ставка"
                  className="h-9 rounded-lg border-white/10 bg-white/[0.02] font-mono text-xs text-foreground"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  Макс. ставка
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={
                    maxStake ??
                    (limits ? String(limits.maxStake) : "")
                  }
                  onChange={(event) => {
                    setMaxStake(event.target.value);
                    setFormError(null);
                  }}
                  disabled={!canManageLimits}
                  aria-label="Максимальная ставка"
                  className="h-9 rounded-lg border-white/10 bg-white/[0.02] font-mono text-xs text-foreground"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  Мин. вывод
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={
                    withdrawalMin ??
                    (limits ? String(limits.withdrawalMin) : "")
                  }
                  onChange={(event) => {
                    setWithdrawalMin(event.target.value);
                    setFormError(null);
                  }}
                  disabled={!canManageLimits}
                  aria-label="Минимальная сумма вывода"
                  className="h-9 rounded-lg border-white/10 bg-white/[0.02] font-mono text-xs text-foreground"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  Макс. вывод
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={
                    withdrawalMax ??
                    (limits ? String(limits.withdrawalMax) : "")
                  }
                  onChange={(event) => {
                    setWithdrawalMax(event.target.value);
                    setFormError(null);
                  }}
                  disabled={!canManageLimits}
                  aria-label="Максимальная сумма вывода"
                  className="h-9 rounded-lg border-white/10 bg-white/[0.02] font-mono text-xs text-foreground"
                />
              </label>
            </div>
          )}

          {formError ? (
            <p className="text-[10px] text-rose-300">{formError}</p>
          ) : (
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Новые значения сразу применяются к новым ставкам и заявкам на
              вывод. Уже созданные заявки не меняются.
            </p>
          )}

          {canManageLimits ? (
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting || !limits}
              className="h-10 w-full rounded-lg bg-emerald-500 text-xs font-semibold text-emerald-950 hover:bg-emerald-400"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Сохранить лимиты
            </Button>
          ) : (
            <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
              <p className="text-[10px] leading-relaxed text-amber-100/80">
                Изменять лимиты могут только Владелец и Старший админ.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
