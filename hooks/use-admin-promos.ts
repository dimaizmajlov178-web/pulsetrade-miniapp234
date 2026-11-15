"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  adminRequestHeaders,
  type AdminPromoCodeView,
  type AdminRole,
} from "@/lib/admin";
import {
  adminPromoCreateSchema,
  adminPromoUpdateSchema,
  type AdminPromoCreateInput,
  type AdminPromoUpdateInput,
} from "@/lib/validation/admin";

type PromosResponse = {
  promos?: AdminPromoCodeView[];
  wageringPercent?: number;
};

export type AdminPromoResult =
  | { ok: true }
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

export function useAdminPromos(role: AdminRole = "owner") {
  const [promos, setPromos] = useState<AdminPromoCodeView[]>([]);
  const [wageringPercent, setWageringPercent] = useState<number>(100);
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

  const apply = useCallback((body: unknown) => {
    const payload = body as PromosResponse;

    setPromos(payload?.promos ?? []);
    setWageringPercent(payload?.wageringPercent ?? 100);
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch("/api/admin/promos", {
        cache: "no-store",
        headers: adminRequestHeaders(role),
      });
      const body = await readJson(response);

      if (!response.ok) {
        throw new Error(
          readErrorMessage(body, "Не удалось загрузить промокоды")
        );
      }

      if (mountedRef.current) {
        apply(body);
        setError(null);
      }
    } catch (requestError) {
      if (mountedRef.current) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Не удалось загрузить промокоды"
        );
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [apply, role]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: AdminPromoCreateInput): Promise<AdminPromoResult> => {
      const parsed = adminPromoCreateSchema.safeParse(input);

      if (!parsed.success) {
        return {
          ok: false,
          message:
            parsed.error.issues[0]?.message ?? "Проверьте данные промокода",
        };
      }

      setIsSubmitting(true);

      try {
        const response = await fetch("/api/admin/promos", {
          method: "POST",
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
            message: readErrorMessage(body, "Не удалось создать промокод"),
          };
        }

        if (mountedRef.current) {
          apply(body);
          setError(null);
        }

        return { ok: true };
      } catch {
        return {
          ok: false,
          message: "Не удалось создать промокод. Проверьте соединение.",
        };
      } finally {
        if (mountedRef.current) {
          setIsSubmitting(false);
        }
      }
    },
    [apply, role]
  );

  const update = useCallback(
    async (
      id: string,
      input: AdminPromoUpdateInput
    ): Promise<AdminPromoResult> => {
      const parsed = adminPromoUpdateSchema.safeParse(input);

      if (!parsed.success) {
        return {
          ok: false,
          message:
            parsed.error.issues[0]?.message ?? "Проверьте данные промокода",
        };
      }

      setIsSubmitting(true);

      try {
        const response = await fetch(
          `/api/admin/promos/${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...adminRequestHeaders(role),
            },
            body: JSON.stringify(parsed.data),
          }
        );
        const body = await readJson(response);

        if (!response.ok) {
          return {
            ok: false,
            message: readErrorMessage(body, "Не удалось обновить промокод"),
          };
        }

        if (mountedRef.current) {
          apply(body);
          setError(null);
        }

        return { ok: true };
      } catch {
        return {
          ok: false,
          message: "Не удалось обновить промокод. Проверьте соединение.",
        };
      } finally {
        if (mountedRef.current) {
          setIsSubmitting(false);
        }
      }
    },
    [apply, role]
  );

  return {
    promos,
    wageringPercent,
    isLoading,
    isSubmitting,
    error,
    refresh,
    create,
    update,
  };
}
