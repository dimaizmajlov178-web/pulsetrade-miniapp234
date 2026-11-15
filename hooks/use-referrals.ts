"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ReferralState } from "@/lib/referrals";
import type { CreateReferralWithdrawalInput } from "@/lib/validation/referral";

type ReferralResponse = {
  referral: ReferralState;
};

export type ReferralActionResult =
  { ok: true; referral: ReferralState } | { ok: false; message: string };

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

export function useReferrals() {
  const [referral, setReferral] = useState<ReferralState | null>(null);
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

  const refresh = useCallback(async (): Promise<ReferralState | null> => {
    try {
      const response = await fetch("/api/referrals", { cache: "no-store" });
      const body = await readJson(response);

      if (!response.ok) {
        throw new Error(
          readErrorMessage(body, "Не удалось загрузить реферальные данные")
        );
      }

      const payload = body as ReferralResponse;

      if (mountedRef.current) {
        setReferral(payload.referral);
        setError(null);
      }

      return payload.referral;
    } catch (requestError) {
      if (mountedRef.current) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Не удалось загрузить реферальные данные"
        );
      }

      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/referrals", { cache: "no-store" });
        const body = await readJson(response);

        if (!response.ok) {
          throw new Error(
            readErrorMessage(body, "Не удалось загрузить реферальные данные")
          );
        }

        if (!cancelled) {
          setReferral((body as ReferralResponse).referral);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Не удалось загрузить реферальные данные"
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
  }, []);

  const withdraw = useCallback(
    async (
      input: CreateReferralWithdrawalInput
    ): Promise<ReferralActionResult> => {
      setIsSubmitting(true);

      try {
        const response = await fetch("/api/referrals/withdraw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const body = await readJson(response);

        if (!response.ok) {
          return {
            ok: false,
            message: readErrorMessage(
              body,
              "Не удалось создать заявку на вывод"
            ),
          };
        }

        const payload = body as ReferralResponse;

        if (!payload?.referral) {
          return { ok: false, message: "Не удалось создать заявку на вывод" };
        }

        if (mountedRef.current) {
          setReferral(payload.referral);
          setError(null);
        }

        return { ok: true, referral: payload.referral };
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
    referral,
    isLoading,
    isSubmitting,
    error,
    withdraw,
    refresh,
  };
}
