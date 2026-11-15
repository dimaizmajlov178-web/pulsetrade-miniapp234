"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { adminRequestHeaders, type AdminRole } from "@/lib/admin";
import {
  adminLimitsSchema,
  type AdminLimitsInput,
} from "@/lib/validation/admin";

export type AdminLimits = {
  minStake: number;
  maxStake: number;
  withdrawalMin: number;
  withdrawalMax: number;
};

type LimitsResponse = {
  limits?: AdminLimits;
};

export type AdminLimitsResult =
  | { ok: true; limits: AdminLimits }
  | { ok: false; message: string };

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

export function useAdminSettings(role: AdminRole = "owner") {
  const [limits, setLimits] = useState<AdminLimits | null>(null);
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

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch("/api/admin/settings", {
        cache: "no-store",
        headers: adminRequestHeaders(role),
      });
      const body = await readJson(response);

      if (!response.ok) {
        throw new Error(
          readErrorMessage(body, "Не удалось загрузить лимиты")
        );
      }

      if (mountedRef.current) {
        setLimits((body as LimitsResponse)?.limits ?? null);
        setError(null);
      }
    } catch (requestError) {
      if (mountedRef.current) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Не удалось загрузить лимиты"
        );
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [role]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (input: AdminLimitsInput): Promise<AdminLimitsResult> => {
      const parsed = adminLimitsSchema.safeParse(input);

      if (!parsed.success) {
        return {
          ok: false,
          message: parsed.error.issues[0]?.message ?? "Проверьте лимиты",
        };
      }

      setIsSubmitting(true);

      try {
        const response = await fetch("/api/admin/settings", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...adminRequestHeaders(role),
          },
          body: JSON.stringify(parsed.data),
        });
        const body = await readJson(response);

        if (!response.ok) {
          return {
            ok: false,
            message: readErrorMessage(body, "Не удалось сохранить лимиты"),
          };
        }

        const payload = body as LimitsResponse;

        if (!payload?.limits) {
          return { ok: false, message: "Не удалось сохранить лимиты" };
        }

        if (mountedRef.current) {
          setLimits(payload.limits);
          setError(null);
        }

        return { ok: true, limits: payload.limits };
      } catch {
        return {
          ok: false,
          message: "Не удалось сохранить лимиты. Проверьте соединение.",
        };
      } finally {
        if (mountedRef.current) {
          setIsSubmitting(false);
        }
      }
    },
    [role]
  );

  return {
    limits,
    isLoading,
    isSubmitting,
    error,
    refresh,
    save,
  };
}
