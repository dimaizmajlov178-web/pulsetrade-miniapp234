"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { depositStatusLabels, type PublicDeposit } from "@/lib/deposits";
import { formatUsdt, type PublicAccount } from "@/lib/trading";
import { cn } from "@/lib/utils";

type DepositResponse = {
  account: PublicAccount;
  deposit: PublicDeposit;
};

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function readErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body) {
    const message = (body as { error?: unknown }).error;

    if (typeof message === "string" && message) {
      return message;
    }
  }

  return fallback;
}

export function DepositCheckout({ depositId }: { depositId: string }) {
  const [deposit, setDeposit] = useState<PublicDeposit | null>(null);
  const [account, setAccount] = useState<PublicAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [autoCheck, setAutoCheck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkingRef = useRef(false);
  const confirmedToastRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(`/api/deposits/${depositId}`, {
          cache: "no-store",
        });
        const body = (await response.json().catch(() => null)) as
          | DepositResponse
          | { error?: string }
          | null;

        if (!response.ok) {
          throw new Error(
            readErrorMessage(body, "Не удалось загрузить счёт на оплату")
          );
        }

        if (!cancelled) {
          const payload = body as DepositResponse;
          setDeposit(payload.deposit);
          setAccount(payload.account);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Не удалось загрузить счёт на оплату"
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [depositId]);

  const runCheck = useCallback(async () => {
    if (checkingRef.current) {
      return;
    }

    checkingRef.current = true;
    setIsChecking(true);

    try {
      const response = await fetch(`/api/deposits/${depositId}/check`, {
        method: "POST",
        cache: "no-store",
      });
      const body = (await response.json().catch(() => null)) as
        | DepositResponse
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(readErrorMessage(body, "Не удалось проверить платёж"));
      }

      const payload = body as DepositResponse;
      setDeposit(payload.deposit);
      setAccount(payload.account);
      setError(null);

      if (payload.deposit.status !== "pending") {
        setAutoCheck(false);
      }

      if (
        payload.deposit.status === "completed" &&
        !confirmedToastRef.current
      ) {
        confirmedToastRef.current = true;
        toast.success(
          `Баланс пополнен на ${formatUsdt(payload.deposit.amount)} USDT`
        );
      }
    } catch (requestError) {
      setAutoCheck(false);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось проверить платёж"
      );
    } finally {
      checkingRef.current = false;
      setIsChecking(false);
    }
  }, [depositId]);

  useEffect(() => {
    if (!autoCheck || deposit?.status !== "pending") {
      return;
    }

    const timer = setInterval(() => {
      void runCheck();
    }, 3_000);

    return () => clearInterval(timer);
  }, [autoCheck, deposit?.status, runCheck]);

  const handlePay = () => {
    setAutoCheck(true);
    void runCheck();
  };

  const status = deposit?.status;
  const pending = status === "pending";
  const completed = status === "completed";

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
          className="inline-flex w-fit items-center gap-1.5 rounded-lg px-1 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />В кошелёк
        </Link>

        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-2.5 py-1.5">
            <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0 text-amber-300" />
            <span className="flex-1 text-[10px] leading-tight text-amber-100/80">
              {error}
            </span>
          </div>
        ) : null}

        <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10 duration-500">
          <CardContent className="space-y-4 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/25">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Платёжный шлюз
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    USDT · сеть TON
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
                  pending
                    ? "bg-amber-400/10 text-amber-300"
                    : completed
                      ? "bg-emerald-400/10 text-emerald-300"
                      : "bg-white/5 text-muted-foreground"
                )}
              >
                {pending ? (
                  <Clock3 className="h-2.5 w-2.5" />
                ) : completed ? (
                  <CheckCircle2 className="h-2.5 w-2.5" />
                ) : null}
                {status ? depositStatusLabels[status] : "Загрузка"}
              </span>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Сумма к оплате
              </p>
              {deposit ? (
                <p className="mt-1 font-mono text-3xl font-semibold leading-none text-foreground">
                  {formatUsdt(deposit.amount)}
                  <span className="ml-1.5 text-xs font-medium text-emerald-400">
                    USDT
                  </span>
                </p>
              ) : (
                <Skeleton className="mt-1 h-8 w-32 bg-white/10" />
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/5 pt-2.5 text-[10px] text-muted-foreground">
              <span>
                Счёт{" "}
                <span className="font-mono text-foreground/80">
                  {depositId.slice(0, 8).toUpperCase()}
                </span>
              </span>
              <span>{deposit ? formatDateTime(deposit.createdAt) : "—"}</span>
            </div>

            <Separator className="bg-white/10" />

            {isLoading ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                <p className="text-xs text-muted-foreground">Загружаем счёт…</p>
              </div>
            ) : completed ? (
              <div className="space-y-3">
                <div className="flex flex-col items-center gap-2 py-2 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/25">
                    <CheckCircle2 className="h-7 w-7" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Платёж подтверждён
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      На баланс зачислено{" "}
                      <span className="font-mono text-emerald-400">
                        {deposit ? formatUsdt(deposit.amount) : "—"} USDT
                      </span>
                    </p>
                  </div>
                  {deposit?.confirmedAt ? (
                    <p className="text-[10px] text-muted-foreground">
                      {formatDateTime(deposit.confirmedAt)}
                    </p>
                  ) : null}
                </div>

                {account ? (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-400/15 bg-emerald-400/5 px-3 py-2">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-emerald-200/70">
                      Общий баланс
                    </span>
                    <span className="font-mono text-sm font-semibold text-emerald-300">
                      {formatUsdt(account.balance)} USDT
                    </span>
                  </div>
                ) : null}

                <Link
                  href="/wallet"
                  className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-400"
                >
                  Вернуться в кошелёк
                </Link>
              </div>
            ) : pending ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2.5">
                  <p className="text-xs font-medium text-amber-200">
                    Ожидаем подтверждение платежа
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-amber-100/60">
                    Средства появятся на балансе только после подтверждения
                    перевода в сети TON.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handlePay}
                  disabled={isChecking}
                  className="h-11 w-full rounded-lg bg-emerald-500 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
                >
                  {isChecking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {isChecking ? "Проверяем платёж" : "Я оплатил"}
                </Button>

                <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
                  Платёж подтверждается автоматически. После этого сумма сразу
                  отразится в общем балансе.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
                  <p className="text-xs font-medium text-foreground">
                    Счёт больше не действует
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                    Создайте новый счёт на пополнение в кошельке.
                  </p>
                </div>
                <Link
                  href="/wallet"
                  className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-400"
                >
                  Создать новый счёт
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
