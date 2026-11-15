"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { PublicAccount } from "@/lib/trading";
import {
  withdrawalLimitsConfig,
  type PublicWithdrawal,
  type WithdrawalLimits,
} from "@/lib/withdrawals";
import type { CreateWithdrawalInput } from "@/lib/validation/withdrawal";

type WithdrawalsResponse = {
  account: PublicAccount;
  withdrawals: PublicWithdrawal[];
  limits: WithdrawalLimits;
  availableBalance: number;
};

type WithdrawalResponse = {
  account: PublicAccount;
  withdrawal: PublicWithdrawal;
  limits: WithdrawalLimits;
  availableBalance: number;
};

type WithdrawalsState = {
  account: PublicAccount | null;
  withdrawals: PublicWithdrawal[];
  limits: WithdrawalLimits;
  availableBalance: number;
};

export type WithdrawalActionResult =
  { ok: true; withdrawal: PublicWithdrawal } | { ok: false; message: string };

const initialState: WithdrawalsState = {
  account: null,
  withdrawals: [],
  limits: withdrawalLimitsConfig,
  availableBalance: 0,
};

function readErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body) {
    const message = (body as { error?: unknown }).error;

    if (typeof message === "string" && message) {
      return message;
    }
  }

  return fallback;
}

function mergeWithdrawal(
  withdrawals: PublicWithdrawal[],
  withdrawal: PublicWithdrawal
): PublicWithdrawal[] {
  return [
    withdrawal,
    ...withdrawals.filter((item) => item.id !== withdrawal.id),
  ].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)
  );
}

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export function useWithdrawals() {
  const [state, setState] = useState<WithdrawalsState>(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applyState = useCallback((next: WithdrawalsResponse) => {
    setState({
      account: next.account,
      withdrawals: next.withdrawals,
      limits: next.limits ?? withdrawalLimitsConfig,
      availableBalance: next.availableBalance,
    });
  }, []);

  const refresh = useCallback(async (): Promise<WithdrawalsResponse | null> => {
    try {
      const response = await fetch("/api/withdrawals", { cache: "no-store" });
      const body = await readJson(response);

      if (!response.ok) {
        throw new Error(
          readErrorMessage(body, "Не удалось загрузить заявки на вывод")
        );
      }

      const next = body as WithdrawalsResponse;

      if (mountedRef.current) {
        applyState(next);
        setError(null);
      }

      return next;
    } catch (requestError) {
      if (mountedRef.current) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Не удалось загрузить заявки на вывод"
        );
      }

      return null;
    }
  }, [applyState]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/withdrawals", {
          cache: "no-store",
        });
        const body = await readJson(response);

        if (!response.ok) {
          throw new Error(
            readErrorMessage(body, "Не удалось загрузить заявки на вывод")
          );
        }

        if (!cancelled) {
          applyState(body as WithdrawalsResponse);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Не удалось загрузить заявки на вывод"
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
  }, [applyState]);

  const createWithdrawal = useCallback(
    async (input: CreateWithdrawalInput): Promise<WithdrawalActionResult> => {
      setIsSubmitting(true);

      try {
        const response = await fetch("/api/withdrawals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const body = await readJson(response);

        if (!response.ok) {
          return {
            ok: false,
            message: readErrorMessage(body, "Не удалось создать заявку"),
          };
        }

        const payload = body as WithdrawalResponse;

        if (!payload?.withdrawal || !payload?.account) {
          return { ok: false, message: "Не удалось создать заявку" };
        }

        if (mountedRef.current) {
          setState((previous) => ({
            account: payload.account,
            withdrawals: mergeWithdrawal(
              previous.withdrawals,
              payload.withdrawal
            ),
            limits: payload.limits ?? previous.limits,
            availableBalance: payload.availableBalance,
          }));
          setError(null);
        }

        return { ok: true, withdrawal: payload.withdrawal };
      } catch {
        return {
          ok: false,
          message: "Не удалось отправить заявку. Проверьте соединение.",
        };
      } finally {
        if (mountedRef.current) {
          setIsSubmitting(false);
        }
      }
    },
    []
  );

  return {
    account: state.account,
    withdrawals: state.withdrawals,
    limits: state.limits,
    availableBalance: state.availableBalance,
    isLoading,
    isSubmitting,
    error,
    createWithdrawal,
    refresh,
  };
}
