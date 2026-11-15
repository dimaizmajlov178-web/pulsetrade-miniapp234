"use client";

import { useState } from "react";
import { CheckCircle2, Gift, Loader2, RefreshCw, WifiOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { PromoActionResult } from "@/hooks/use-promo";
import { type PublicBonusActivation } from "@/lib/promo";
import { formatUsdt } from "@/lib/trading";
import {
  activatePromoCodeSchema,
  type ActivatePromoInput,
} from "@/lib/validation/promo";
import { cn } from "@/lib/utils";

type PromoBonusCardProps = {
  activations: PublicBonusActivation[];
  wageringPercent: number;
  isLoading: boolean;
  isActivating: boolean;
  error: string | null;
  onActivate: (input: ActivatePromoInput) => Promise<PromoActionResult>;
  onRefresh: () => void;
};

function formatPercent(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function BonusProgress({ activation }: { activation: PublicBonusActivation }) {
  const completed = activation.status === "completed";

  return (
    <div
      className={cn(
        "space-y-2 rounded-xl border px-3 py-2.5",
        completed
          ? "border-emerald-400/25 bg-emerald-400/[0.07]"
          : "border-emerald-400/20 bg-emerald-400/5"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            Бонус зачислен
          </p>
          <p className="font-mono text-lg font-semibold leading-tight text-emerald-400">
            +{formatUsdt(activation.bonusAmount)}{" "}
            <span className="text-[10px] font-medium">USDT</span>
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
            completed
              ? "bg-emerald-400/10 text-emerald-300"
              : "bg-amber-400/10 text-amber-300"
          )}
        >
          {completed ? (
            <CheckCircle2 className="h-2.5 w-2.5" />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
          )}
          {completed ? "Отыгран" : "Отыгрыш"}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2 text-[10px]">
          <span
            className={completed ? "text-emerald-300" : "text-foreground/80"}
          >
            {completed
              ? "Бонус полностью отыгран"
              : `Отыграно ${activation.progressPercent}%`}
          </span>
          <span className="font-mono text-muted-foreground">
            {formatUsdt(activation.wageredAmount)} /{" "}
            {formatUsdt(activation.requiredWagering)}
          </span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={activation.progressPercent}
          aria-label="Прогресс отыгрыша бонуса"
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              completed ? "bg-emerald-400" : "bg-emerald-500/80"
            )}
            style={{ width: `${activation.progressPercent}%` }}
          />
        </div>
      </div>

      <p className="text-[9px] leading-relaxed text-muted-foreground">
        {completed
          ? "Бонус отыгран. Спасибо за игру."
          : `Требуется отыграть ${formatPercent(
              activation.wageringPercent
            )}% бонуса ставками с баланса.`}
      </p>
    </div>
  );
}

export function PromoBonusCard({
  activations,
  wageringPercent,
  isLoading,
  isActivating,
  error,
  onActivate,
  onRefresh,
}: PromoBonusCardProps) {
  const [codeInput, setCodeInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const activeBonuses = activations.filter(
    (activation) => activation.status === "active"
  );

  const handleActivate = async () => {
    const parsed = activatePromoCodeSchema.safeParse({ code: codeInput });

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Проверьте промокод";
      setFormError(message);
      toast.error(message);
      return;
    }

    setFormError(null);
    const result = await onActivate(parsed.data);

    if (!result.ok) {
      setFormError(result.message);
      toast.error(result.message);
      return;
    }

    setCodeInput("");
    toast.success(
      `Бонус ${formatUsdt(result.activation.bonusAmount)} USDT зачислен`
    );
  };

  const displayError = formError ?? error;

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10 duration-500">
      <CardContent className="space-y-3 px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Промокод
          </p>
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-emerald-300">
            <Gift className="h-2.5 w-2.5" />
            Бонус
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={codeInput}
            onChange={(event) => {
              setCodeInput(event.target.value.toUpperCase());
              setFormError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !isActivating) {
                event.preventDefault();
                void handleActivate();
              }
            }}
            placeholder="Например, WELCOME"
            aria-label="Промокод"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            disabled={isLoading || isActivating}
            className={cn(
              "h-10 rounded-lg border-white/10 bg-white/[0.02] px-3 font-mono text-sm uppercase tracking-wide text-foreground placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground/60 focus-visible:ring-emerald-400/40",
              displayError && "border-rose-400/50"
            )}
          />
          <Button
            type="button"
            onClick={() => void handleActivate()}
            disabled={isLoading || isActivating || !codeInput.trim()}
            className="h-10 shrink-0 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
          >
            {isActivating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Gift className="h-4 w-4" />
            )}
            Активировать
          </Button>
        </div>

        <div className="flex items-start gap-1.5">
          {displayError ? (
            <>
              <WifiOff className="mt-0.5 h-3 w-3 shrink-0 text-rose-300" />
              <p className="flex-1 text-[10px] leading-tight text-rose-300">
                {displayError}
              </p>
              {error ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={onRefresh}
                  className="h-5 px-1.5 text-[9px] text-rose-200 hover:bg-rose-400/10 hover:text-rose-100"
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                  Повторить
                </Button>
              ) : null}
            </>
          ) : (
            <p className="text-[10px] leading-tight text-muted-foreground">
              Введите код, чтобы получить бонус на баланс. Отыгрыш —{" "}
              {formatPercent(wageringPercent)}% бонуса.
            </p>
          )}
        </div>

        {activeBonuses.length > 0 ? (
          <div className="space-y-2">
            {activeBonuses.map((activation) => (
              <BonusProgress key={activation.id} activation={activation} />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
