"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  depositLimitsConfig,
  type DepositLimits,
  type PublicDeposit,
} from "@/lib/deposits";
import type { PublicAccount } from "@/lib/trading";

type DepositsResponse = {
  account: PublicAccount;
  deposits: PublicDeposit[];
  limits: DepositLimits;
};

type DepositResponse = {
  account: PublicAccount;
  deposit: PublicDeposit;
  limits: DepositLimits;
};

type DepositsState = {
  account: PublicAccount | null;
  deposits: PublicDeposit[];
  limits: DepositLimits;
};

export type DepositActionResult =
  | { ok: true; deposit: PublicDeposit; account: PublicAccount }
  | { ok: false; message: string };

const initialState: DepositsState = {
  account: null,
  deposits: [],
  limits: depositLimitsConfig,
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

function mergeDeposit(
  deposits: PublicDeposit[],
  deposit: PublicDeposit
): PublicDeposit[] {
  return [deposit, ...deposits.filter((item) => item.id !== deposit.id)].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)
  );
}

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export function useDeposits() {
  const [state, setState] = useState<DepositsState>(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applyState = useCallback((next: DepositsResponse) => {
    setState({
      account: next.account,
      deposits: next.deposits,
      limits: next.limits ?? depositLimitsConfig,
    });
  }, []);

  const refresh = useCallback(async (): Promise<DepositsResponse | null> => {
    try {
      const response = await fetch("/api/deposits", { cache: "no-store" });
      const body = await readJson(response);

      if (!response.ok) {
        throw new Error(
          readErrorMessage(body, "Не удалось загрузить пополнения")
        );
      }

      const next = body as DepositsResponse;

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
            : "Не удалось загрузить пополнения"
        );
      }

      return null;
    }
  }, [applyState]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/deposits", { cache: "no-store" });
        const body = await readJson(response);

        if (!response.ok) {
          throw new Error(
            readErrorMessage(body, "Не удалось загрузить пополнения")
          );
        }

        if (!cancelled) {
          applyState(body as DepositsResponse);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Не удалось загрузить пополнения"
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

  const createDeposit = useCallback(
    async (amount: number): Promise<DepositActionResult> => {
      setIsCreating(true);

      try {
        const response = await fetch("/api/deposits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount }),
        });
        const body = await readJson(response);

        if (!response.ok) {
          return {
            ok: false,
            message: readErrorMessage(body, "Не удалось создать пополнение"),
          };
        }

        const payload = body as DepositResponse;

        if (!payload?.deposit || !payload?.account) {
          return { ok: false, message: "Не удалось создать пополнение" };
        }

        if (mountedRef.current) {
          setState((previous) => ({
            account: payload.account,
            deposits: mergeDeposit(previous.deposits, payload.deposit),
            limits: payload.limits ?? previous.limits,
          }));
          setError(null);
        }

        return {
          ok: true,
          deposit: payload.deposit,
          account: payload.account,
        };
      } catch {
        return {
          ok: false,
          message: "Не удалось отправить запрос. Проверьте соединение.",
        };
      } finally {
        if (mountedRef.current) {
          setIsCreating(false);
        }
      }
    },
    []
  );

  const checkDeposit = useCallback(
    async (id: string): Promise<DepositActionResult> => {
      setCheckingId(id);

      try {
        const response = await fetch(`/api/deposits/${id}/check`, {
          method: "POST",
          cache: "no-store",
        });
        const body = await readJson(response);

        if (!response.ok) {
          return {
            ok: false,
            message: readErrorMessage(body, "Не удалось проверить платёж"),
          };
        }

        const payload = body as DepositResponse;

        if (!payload?.deposit || !payload?.account) {
          return { ok: false, message: "Не удалось проверить платёж" };
        }

        if (mountedRef.current) {
          setState((previous) => ({
            account: payload.account,
            deposits: mergeDeposit(previous.deposits, payload.deposit),
            limits: payload.limits ?? previous.limits,
          }));
          setError(null);
        }

        return {
          ok: true,
          deposit: payload.deposit,
          account: payload.account,
        };
      } catch {
        return {
          ok: false,
          message: "Не удалось проверить платёж. Проверьте соединение.",
        };
      } finally {
        if (mountedRef.current) {
          setCheckingId(null);
        }
      }
    },
    []
  );

  return {
    account: state.account,
    deposits: state.deposits,
    limits: state.limits,
    isLoading,
    isCreating,
    checkingId,
    error,
    createDeposit,
    checkDeposit,
    refresh,
  };
}
