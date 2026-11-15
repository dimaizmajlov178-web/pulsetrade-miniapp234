"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  tradingLimits,
  type PublicAccount,
  type PublicTrade,
  type TradeStatus,
  type TradingLimits,
} from "@/lib/trading";
import type { CreateTradeInput } from "@/lib/validation/trade";

type TradingResponse = {
  account: PublicAccount;
  trades: PublicTrade[];
  limits: TradingLimits;
};

export type TradingState = {
  account: PublicAccount | null;
  trades: PublicTrade[];
  limits: TradingLimits;
};

export type PlaceTradeResult = { ok: true } | { ok: false; message: string };

const initialState: TradingState = {
  account: null,
  trades: [],
  limits: tradingLimits,
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

async function requestState(): Promise<TradingResponse> {
  const response = await fetch("/api/trades", {
    cache: "no-store",
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      readErrorMessage(body, "Не удалось загрузить состояние счёта")
    );
  }

  return body as TradingResponse;
}

export function useTrading() {
  const [state, setState] = useState<TradingState>(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settledTrades, setSettledTrades] = useState<PublicTrade[]>([]);
  const statusesRef = useRef<Map<string, TradeStatus>>(new Map());
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applyState = useCallback((next: TradingResponse) => {
    setState({
      account: next.account,
      trades: next.trades,
      limits: next.limits ?? tradingLimits,
    });

    const newlySettled: PublicTrade[] = [];

    for (const trade of next.trades) {
      const previousStatus = statusesRef.current.get(trade.id);

      if (previousStatus === "open" && trade.status !== "open") {
        newlySettled.push(trade);
      }

      statusesRef.current.set(trade.id, trade.status);
    }

    if (newlySettled.length > 0) {
      setSettledTrades((previous) => [...previous, ...newlySettled]);
    }
  }, []);

  const refresh = useCallback(async (): Promise<TradingResponse | null> => {
    try {
      const next = await requestState();

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
            : "Не удалось загрузить состояние счёта"
        );
      }

      return null;
    }
  }, [applyState]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const next = await requestState();

        if (!cancelled) {
          applyState(next);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Не удалось загрузить состояние счёта"
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

  const activeTrades = state.trades
    .filter((trade) => trade.status === "open")
    .sort(
      (left, right) => Date.parse(left.expiresAt) - Date.parse(right.expiresAt)
    );
  const nextExpiry = activeTrades[0]?.expiresAt ?? null;

  useEffect(() => {
    if (!nextExpiry) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const attempt = async () => {
      if (cancelled) {
        return;
      }

      const next = await refresh();

      if (cancelled) {
        return;
      }

      const now = Date.now();
      const hasExpiredOpenTrade =
        !next ||
        next.trades.some(
          (trade) =>
            trade.status === "open" && Date.parse(trade.expiresAt) <= now
        );

      if (hasExpiredOpenTrade) {
        timer = setTimeout(attempt, 5_000);
      }
    };

    const delay = Math.max(Date.parse(nextExpiry) - Date.now(), 0) + 500;
    timer = setTimeout(attempt, delay);

    return () => {
      cancelled = true;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [nextExpiry, refresh]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);

  const placeTrade = useCallback(
    async (input: CreateTradeInput): Promise<PlaceTradeResult> => {
      setIsPlacing(true);

      try {
        const response = await fetch("/api/trades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });

        const body: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          return {
            ok: false,
            message: readErrorMessage(body, "Не удалось подтвердить ставку"),
          };
        }

        const payload = body as {
          account: PublicAccount;
          trade: PublicTrade;
        };

        if (!payload?.account || !payload?.trade) {
          return {
            ok: false,
            message: "Не удалось подтвердить ставку",
          };
        }

        if (mountedRef.current) {
          setState((previous) => ({
            account: payload.account,
            trades: [
              payload.trade,
              ...previous.trades.filter(
                (trade) => trade.id !== payload.trade.id
              ),
            ],
            limits: previous.limits,
          }));
          statusesRef.current.set(payload.trade.id, payload.trade.status);
          setError(null);
        }

        return { ok: true };
      } catch {
        return {
          ok: false,
          message: "Не удалось отправить ставку. Проверьте соединение.",
        };
      } finally {
        if (mountedRef.current) {
          setIsPlacing(false);
        }
      }
    },
    []
  );

  const clearSettledTrade = useCallback(() => {
    setSettledTrades((previous) => previous.slice(1));
  }, []);

  return {
    account: state.account,
    trades: state.trades,
    limits: state.limits,
    activeTrades,
    latestTrade: state.trades[0] ?? null,
    isLoading,
    isPlacing,
    error,
    settledTrade: settledTrades[0] ?? null,
    clearSettledTrade,
    placeTrade,
    refresh,
  };
}
