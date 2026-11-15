"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  DEFAULT_WAGERING_PERCENT,
  type PublicBonusActivation,
} from "@/lib/promo";
import type { PublicAccount } from "@/lib/trading";
import type { ActivatePromoInput } from "@/lib/validation/promo";

type PromoResponse = {
  account: PublicAccount;
  activations: PublicBonusActivation[];
  wageringPercent: number;
};

type PromoActivationResponse = PromoResponse & {
  activation: PublicBonusActivation;
};

type PromoState = {
  account: PublicAccount | null;
  activations: PublicBonusActivation[];
  wageringPercent: number;
};

export type PromoActionResult =
  | {
      ok: true;
      activation: PublicBonusActivation;
      account: PublicAccount;
    }
  | { ok: false; message: string };

const initialState: PromoState = {
  account: null,
  activations: [],
  wageringPercent: DEFAULT_WAGERING_PERCENT,
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

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export function usePromo() {
  const [state, setState] = useState<PromoState>(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applyState = useCallback((next: PromoResponse) => {
    setState({
      account: next.account,
      activations: next.activations,
      wageringPercent: next.wageringPercent ?? DEFAULT_WAGERING_PERCENT,
    });
  }, []);

  const refresh = useCallback(async (): Promise<PromoResponse | null> => {
    try {
      const response = await fetch("/api/promo", { cache: "no-store" });
      const body = await readJson(response);

      if (!response.ok) {
        throw new Error(readErrorMessage(body, "Не удалось загрузить бонусы"));
      }

      const next = body as PromoResponse;

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
            : "Не удалось загрузить бонусы"
        );
      }

      return null;
    }
  }, [applyState]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/promo", { cache: "no-store" });
        const body = await readJson(response);

        if (!response.ok) {
          throw new Error(
            readErrorMessage(body, "Не удалось загрузить бонусы")
          );
        }

        if (!cancelled) {
          applyState(body as PromoResponse);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Не удалось загрузить бонусы"
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

  const activate = useCallback(
    async (input: ActivatePromoInput): Promise<PromoActionResult> => {
      setIsActivating(true);

      try {
        const response = await fetch("/api/promo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const body = await readJson(response);

        if (!response.ok) {
          return {
            ok: false,
            message: readErrorMessage(body, "Не удалось активировать промокод"),
          };
        }

        const payload = body as PromoActivationResponse;

        if (!payload?.activation || !payload?.account) {
          return { ok: false, message: "Не удалось активировать промокод" };
        }

        if (mountedRef.current) {
          setState({
            account: payload.account,
            activations: payload.activations ?? [payload.activation],
            wageringPercent:
              payload.wageringPercent ?? DEFAULT_WAGERING_PERCENT,
          });
          setError(null);
        }

        return {
          ok: true,
          activation: payload.activation,
          account: payload.account,
        };
      } catch {
        return {
          ok: false,
          message: "Не удалось отправить промокод. Проверьте соединение.",
        };
      } finally {
        if (mountedRef.current) {
          setIsActivating(false);
        }
      }
    },
    []
  );

  return {
    account: state.account,
    activations: state.activations,
    wageringPercent: state.wageringPercent,
    isLoading,
    isActivating,
    error,
    activate,
    refresh,
  };
}
