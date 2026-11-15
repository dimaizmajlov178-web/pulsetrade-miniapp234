"use client";

import { useState } from "react";
import {
  BadgePercent,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  Ticket,
  WifiOff,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminPromos } from "@/hooks/use-admin-promos";
import type { AdminPromoCodeView, AdminRole } from "@/lib/admin";
import { formatUsdt } from "@/lib/trading";
import {
  adminPromoCreateSchema,
  adminPromoUpdateSchema,
} from "@/lib/validation/admin";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatDate(value: string) {
  if (!value) {
    return "—";
  }

  return dateFormatter.format(new Date(value));
}

function statusBadgeClass(status: AdminPromoCodeView["status"]) {
  return status === "active"
    ? "bg-emerald-400/10 text-emerald-300"
    : "bg-white/5 text-muted-foreground";
}

function PromoCard({
  promo,
  canManage,
  isSubmitting,
  onUpdate,
}: {
  promo: AdminPromoCodeView;
  canManage: boolean;
  isSubmitting: boolean;
  onUpdate: (
    input: { bonusAmount: number; status: AdminPromoCodeView["status"] }
  ) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [bonusInput, setBonusInput] = useState(String(promo.bonusAmount));
  const [status, setStatus] = useState(promo.status);
  const [formError, setFormError] = useState<string | null>(null);

  const applyUpdate = async (
    next: { bonusAmount: number; status: AdminPromoCodeView["status"] }
  ) => {
    const result = await onUpdate(next);

    if (!result.ok) {
      const message = result.message ?? "Не удалось обновить промокод";
      setFormError(message);
      toast.error(message);
      return;
    }

    setIsEditing(false);
    setFormError(null);
    toast.success("Промокод обновлён");
  };

  const handleSave = async () => {
    const parsed = adminPromoUpdateSchema.safeParse({
      bonusAmount: Number(bonusInput.replace(",", ".").trim()),
      status,
    });

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Проверьте данные промокода";
      setFormError(message);
      toast.error(message);
      return;
    }

    await applyUpdate(parsed.data);
  };

  const handleToggle = async () => {
    await applyUpdate({
      bonusAmount: promo.bonusAmount,
      status: promo.status === "active" ? "disabled" : "active",
    });
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
      <div className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20">
          <Ticket className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="font-mono text-xs font-semibold tracking-wide text-foreground">
              {promo.code}
            </p>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
                statusBadgeClass(promo.status)
              )}
            >
              {promo.status === "active" ? "Активен" : "Отключён"}
            </span>
            {promo.isDefault ? (
              <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                Базовый
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Бонус {formatUsdt(promo.bonusAmount)} USDT ·{" "}
            {promo.isDefault ? "по умолчанию" : `создан ${formatDate(promo.createdAt)}`}
          </p>
        </div>
        {canManage ? (
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => {
                setIsEditing((value) => {
                  if (!value) {
                    setBonusInput(String(promo.bonusAmount));
                    setStatus(promo.status);
                  }

                  return !value;
                });
                setFormError(null);
              }}
              disabled={isSubmitting}
              className="h-7 border-white/10 bg-white/[0.02] px-2 text-[10px] text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              {isEditing ? (
                <X className="h-3 w-3" />
              ) : (
                <Pencil className="h-3 w-3" />
              )}
              {isEditing ? "Отмена" : "Изменить"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => void handleToggle()}
              disabled={isSubmitting}
              className={cn(
                "h-7 border px-2 text-[10px]",
                promo.status === "active"
                  ? "border-rose-400/20 bg-rose-400/5 text-rose-300 hover:bg-rose-400/10"
                  : "border-emerald-400/20 bg-emerald-400/5 text-emerald-300 hover:bg-emerald-400/10"
              )}
            >
              {isSubmitting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : null}
              {promo.status === "active" ? "Отключить" : "Включить"}
            </Button>
          </div>
        ) : null}
      </div>

      {isEditing && canManage ? (
        <div className="mt-2 space-y-2 rounded-lg border border-white/10 bg-[#0a0f0d] px-2.5 py-2">
          <div className="flex items-end gap-2">
            <label className="flex-1 space-y-1">
              <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                Сумма бонуса, USDT
              </span>
              <Input
                type="text"
                inputMode="decimal"
                value={bonusInput}
                onChange={(event) => {
                  setBonusInput(event.target.value);
                  setFormError(null);
                }}
                aria-label="Сумма бонуса"
                className="h-8 rounded-lg border-white/10 bg-white/[0.02] font-mono text-xs text-foreground"
              />
            </label>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => setStatus("active")}
                disabled={isSubmitting}
                className={cn(
                  "h-8 rounded-lg border px-2 text-[10px]",
                  status === "active"
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                    : "border-white/10 bg-white/[0.02] text-muted-foreground"
                )}
              >
                Вкл
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => setStatus("disabled")}
                disabled={isSubmitting}
                className={cn(
                  "h-8 rounded-lg border px-2 text-[10px]",
                  status === "disabled"
                    ? "border-rose-400/40 bg-rose-400/10 text-rose-300"
                    : "border-white/10 bg-white/[0.02] text-muted-foreground"
                )}
              >
                Выкл
              </Button>
            </div>
          </div>
          {formError ? (
            <p className="text-[10px] text-rose-300">{formError}</p>
          ) : null}
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSubmitting}
            className="h-8 w-full rounded-lg bg-emerald-500 text-[11px] font-semibold text-emerald-950 hover:bg-emerald-400"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Pencil className="h-3.5 w-3.5" />
            )}
            Сохранить
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function AdminPromosPanel({
  role,
  canManagePromos,
}: {
  role: AdminRole;
  canManagePromos: boolean;
}) {
  const {
    promos,
    wageringPercent,
    isLoading,
    isSubmitting,
    error,
    refresh,
    create,
    update,
  } = useAdminPromos(role);
  const [codeInput, setCodeInput] = useState("");
  const [bonusInput, setBonusInput] = useState("");
  const [status, setStatus] = useState<AdminPromoCodeView["status"]>("active");
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreate = async () => {
    const parsed = adminPromoCreateSchema.safeParse({
      code: codeInput,
      bonusAmount: Number(bonusInput.replace(",", ".").trim()),
      status,
    });

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Проверьте данные промокода";
      setFormError(message);
      toast.error(message);
      return;
    }

    const result = await create(parsed.data);

    if (result.ok) {
      setCodeInput("");
      setBonusInput("");
      setStatus("active");
      setFormError(null);
      toast.success("Промокод создан");
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

      <Card className="gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10">
        <CardContent className="space-y-2 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20">
                <BadgePercent className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Промокоды
                </p>
                <p className="text-sm font-semibold text-foreground">
                  Бонусы на реальный баланс
                </p>
              </div>
            </div>
            <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-muted-foreground">
              Отыгрыш {wageringPercent}%
            </span>
          </div>

          {canManagePromos ? (
            <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                Новый промокод
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="text"
                  value={codeInput}
                  onChange={(event) => {
                    setCodeInput(event.target.value.toUpperCase());
                    setFormError(null);
                  }}
                  placeholder="КОД"
                  aria-label="Код промокода"
                  maxLength={32}
                  className="h-9 rounded-lg border-white/10 bg-white/[0.02] font-mono text-xs uppercase text-foreground placeholder:text-muted-foreground/60"
                />
                <Input
                  type="text"
                  inputMode="decimal"
                  value={bonusInput}
                  onChange={(event) => {
                    setBonusInput(event.target.value);
                    setFormError(null);
                  }}
                  placeholder="Сумма, USDT"
                  aria-label="Сумма бонуса"
                  className="h-9 rounded-lg border-white/10 bg-white/[0.02] font-mono text-xs text-foreground placeholder:text-muted-foreground/60"
                />
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setStatus("active")}
                  disabled={isSubmitting}
                  className={cn(
                    "h-8 flex-1 rounded-lg border text-[10px]",
                    status === "active"
                      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                      : "border-white/10 bg-white/[0.02] text-muted-foreground"
                  )}
                >
                  Активен
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setStatus("disabled")}
                  disabled={isSubmitting}
                  className={cn(
                    "h-8 flex-1 rounded-lg border text-[10px]",
                    status === "disabled"
                      ? "border-rose-400/40 bg-rose-400/10 text-rose-300"
                      : "border-white/10 bg-white/[0.02] text-muted-foreground"
                  )}
                >
                  Отключён
                </Button>
              </div>
              {formError ? (
                <p className="text-[10px] text-rose-300">{formError}</p>
              ) : null}
              <Button
                type="button"
                onClick={() => void handleCreate()}
                disabled={isSubmitting}
                className="h-9 w-full rounded-lg bg-emerald-500 text-xs font-semibold text-emerald-950 hover:bg-emerald-400"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Создать промокод
              </Button>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
              <p className="text-[10px] leading-relaxed text-amber-100/80">
                Управлять промокодами могут Владелец, Старший админ и Менеджер.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10">
        <CardContent className="px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Все промокоды
            </p>
            <span className="text-[10px] text-muted-foreground">
              {promos.length}
            </span>
          </div>
          <Separator className="bg-white/10" />
          {isLoading && promos.length === 0 ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-14 w-full rounded-xl bg-white/10" />
              <Skeleton className="h-14 w-full rounded-xl bg-white/10" />
            </div>
          ) : promos.length === 0 ? (
            <p className="py-4 text-center text-[10px] text-muted-foreground">
              Промокодов пока нет
            </p>
          ) : (
            <div className="space-y-2 pt-1">
              {promos.map((promo) => (
                <PromoCard
                  key={promo.id}
                  promo={promo}
                  canManage={canManagePromos}
                  isSubmitting={isSubmitting}
                  onUpdate={(input) => update(promo.id, input)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
