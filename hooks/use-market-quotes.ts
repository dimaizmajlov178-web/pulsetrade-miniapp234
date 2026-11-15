"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  defaultMarketTimeframe,
  isMarketTimeframeId,
  marketPairIds,
  type MarketPairId,
  type MarketSnapshot,
  type MarketTimeframeId,
} from "@/lib/market-data";

const POLL_INTERVAL_MS = 3_000;
const REQUEST_TIMEOUT_MS = 9_000;
const FALLBACK_ERROR = "Источник котировок временно недоступен";

export type MarketQuote = {
  snapshot: MarketSnapshot | null;
  isLoading: boolean;
  error: string | null;
};

const emptyQuote: MarketQuote = {
  snapshot: null,
  isLoading: true,
  error: null,
};

function isMarketCandle(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candle = value as Record<string, unknown>;

  return (
    typeof candle.time === "number" &&
    Number.isFinite(candle.time) &&
    typeof candle.open === "number" &&
    Number.isFinite(candle.open) &&
    typeof candle.high === "number" &&
    Number.isFinite(candle.high) &&
    typeof candle.low === "number" &&
    Number.isFinite(candle.low) &&
    typeof candle.close === "number" &&
    Number.isFinite(candle.close)
  );
}

function isMarketSnapshot(value: unknown): value is MarketSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const series = candidate.series;
  const candles = candidate.candles;

  return (
    typeof candidate.pairId === "string" &&
    typeof candidate.symbol === "string" &&
    isMarketTimeframeId(candidate.timeframe) &&
    typeof candidate.price === "number" &&
    Number.isFinite(candidate.price) &&
    typeof candidate.change === "number" &&
    typeof candidate.high === "number" &&
    typeof candidate.low === "number" &&
    typeof candidate.updatedAt === "number" &&
    Array.isArray(series) &&
    series.length > 1 &&
    series.every((item) => typeof item === "number" && Number.isFinite(item)) &&
    Array.isArray(candles) &&
    candles.length > 1 &&
    candles.every(isMarketCandle)
  );
}

function readErrorMessage(error: unknown) {
  if (
    error instanceof Error &&
    error.name !== "AbortError" &&
    !(error instanceof TypeError) &&
    error.message
  ) {
    return error.message;
  }

  return FALLBACK_ERROR;
}

async function requestSnapshot(
  targetId: MarketPairId,
  timeframe: MarketTimeframeId,
  signal: AbortSignal
): Promise<MarketSnapshot> {
  const response = await fetch(
    `/api/market?pair=${targetId}&timeframe=${timeframe}`,
    {
      cache: "no-store",
      signal,
    }
  );

  if (!response.ok) {
    let message = FALLBACK_ERROR;

    try {
      const body = (await response.json()) as { error?: unknown };
      if (typeof body.error === "string" && body.error) {
        message = body.error;
      }
    } catch {
      // Ответ без JSON — показываем общий текст ошибки.
    }

    throw new Error(message);
  }

  const snapshot: unknown = await response.json();

  if (
    !isMarketSnapshot(snapshot) ||
    snapshot.pairId !== targetId ||
    snapshot.timeframe !== timeframe
  ) {
    throw new Error(FALLBACK_ERROR);
  }

  return snapshot;
}

export function useMarketQuotes(
  pairId: MarketPairId,
  timeframe: MarketTimeframeId = defaultMarketTimeframe
) {
  const [quotes, setQuotes] = useState<
    Partial<Record<MarketPairId, MarketQuote>>
  >({});
  const [retryToken, setRetryToken] = useState(0);
  const initialPairRef = useRef(pairId);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const targets = marketPairIds.filter((id) => id !== initialPairRef.current);

    const prefetch = async () => {
      for (const targetId of targets) {
        if (cancelled) {
          return;
        }

        try {
          const snapshot = await requestSnapshot(
            targetId,
            defaultMarketTimeframe,
            controller.signal
          );

          if (cancelled) {
            return;
          }

          setQuotes((previous) => {
            const current = previous[targetId];

            if (
              current?.snapshot &&
              current.snapshot.updatedAt >= snapshot.updatedAt
            ) {
              return previous;
            }

            return {
              ...previous,
              [targetId]: {
                snapshot,
                isLoading: false,
                error: null,
              },
            };
          });
        } catch {
          // Предзагрузка необязательна: при выборе пары сработает основной запрос.
        }
      }
    };

    void prefetch();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const effectController = new AbortController();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight = false;

    const patchQuote = (
      targetId: MarketPairId,
      patch: Partial<MarketQuote>
    ) => {
      setQuotes((previous) => {
        const current = previous[targetId] ?? emptyQuote;

        return {
          ...previous,
          [targetId]: { ...current, ...patch },
        };
      });
    };

    const requestQuote = async () => {
      if (cancelled || inFlight) {
        return;
      }

      inFlight = true;

      const requestController = new AbortController();
      const cancelRequest = () => requestController.abort();
      effectController.signal.addEventListener("abort", cancelRequest);
      const timeout = setTimeout(
        () => requestController.abort(),
        REQUEST_TIMEOUT_MS
      );

      try {
        const snapshot = await requestSnapshot(
          pairId,
          timeframe,
          requestController.signal
        );

        if (cancelled) {
          return;
        }

        patchQuote(pairId, {
          snapshot,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        if (cancelled || effectController.signal.aborted) {
          return;
        }

        patchQuote(pairId, {
          isLoading: false,
          error: readErrorMessage(error),
        });
      } finally {
        clearTimeout(timeout);
        effectController.signal.removeEventListener("abort", cancelRequest);
        inFlight = false;
      }
    };

    const scheduleNext = () => {
      clearTimeout(timer);
      timer = setTimeout(run, POLL_INTERVAL_MS);
    };

    const run = async () => {
      if (cancelled) {
        return;
      }

      if (document.visibilityState === "hidden") {
        scheduleNext();
        return;
      }

      await requestQuote();

      if (!cancelled) {
        scheduleNext();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !cancelled) {
        clearTimeout(timer);
        void run();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    void run();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      effectController.abort();
    };
  }, [pairId, retryToken, timeframe]);

  const retry = useCallback(() => {
    setQuotes((previous) => {
      const current = previous[pairId];

      if (!current) {
        return previous;
      }

      return {
        ...previous,
        [pairId]: {
          ...current,
          isLoading: !current.snapshot,
          error: null,
        },
      };
    });
    setRetryToken((token) => token + 1);
  }, [pairId]);

  return {
    quote: quotes[pairId] ?? emptyQuote,
    quotes,
    retry,
  };
}
