"use client";

import { useCallback, useEffect, useState } from "react";

import {
  adminRequestHeaders,
  type AdminRole,
} from "@/lib/admin";
import type { AdminWithdrawal, PublicWithdrawal } from "@/lib/withdrawals";
import {
  withdrawalDecisionSchema,
  type WithdrawalDecisionInput,
} from "@/lib/validation/withdrawal";

type AdminWithdrawalsResponse = {
  withdrawals: AdminWithdrawal[];
};

type WithdrawalDecisionResponse = {
  withdrawal?: PublicWithdrawal;
};

export type AdminWithdrawalResult =
  { ok: true; withdrawal: AdminWithdrawal } | { ok: false; message: string };

function readErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body) {
    const message = (body as { error?: unknown }).error;

    if (typeof message === "string" && message) {
      return message;
    }
  }

  return fallback;
}

function sortWithdrawals(withdrawals: AdminWithdrawal[]): AdminWithdrawal[] {
  return [...withdrawals].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)
  );
}

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export function useAdminWithdrawals(role: AdminRole = "owner") {
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch("/api/admin/withdrawals", {
        cache: "no-store",
        headers: adminRequestHeaders(role),
      });
      const body = await readJson(response);

      if (!response.ok) {
        throw new Error(
          readErrorMessage(body, "Не удалось загрузить заявки на вывод")
        );
      }

      const payload = body as AdminWithdrawalsResponse;
      setWithdrawals(sortWithdrawals(payload?.withdrawals ?? []));
      setError(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось загрузить заявки на вывод"
      );
    } finally {
      setIsLoading(false);
    }
  }, [role]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const response = await fetch("/api/admin/withdrawals", {
          cache: "no-store",
          headers: adminRequestHeaders(role),
        });
        const body = await readJson(response);

        if (!response.ok) {
          throw new Error(
            readErrorMessage(body, "Не удалось загрузить заявки на вывод")
          );
        }

        if (!cancelled) {
          const payload = body as AdminWithdrawalsResponse;
          setWithdrawals(sortWithdrawals(payload?.withdrawals ?? []));
          setError(null);
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

    void run();

    return () => {
      cancelled = true;
    };
  }, [role]);

  const decide = useCallback(
    async (
      id: string,
      decision: WithdrawalDecisionInput
    ): Promise<AdminWithdrawalResult> => {
      const parsed = withdrawalDecisionSchema.safeParse(decision);

      if (!parsed.success) {
        return {
          ok: false,
          message:
            parsed.error.issues[0]?.message ??
            "Проверьте данные решения по заявке",
        };
      }

      const current = withdrawals.find((item) => item.id === id);

      if (!current) {
        return { ok: false, message: "Заявка не найдена" };
      }

      setProcessingId(id);

      try {
        const response = await fetch(`/api/withdrawals/${id}`, {
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
            message: readErrorMessage(body, "Не удалось обработать заявку"),
          };
        }

        const payload = body as WithdrawalDecisionResponse;

        if (!payload?.withdrawal) {
          return { ok: false, message: "Не удалось обработать заявку" };
        }

        const updated: AdminWithdrawal = {
          ...current,
          ...payload.withdrawal,
          uid: current.uid,
        };

        setWithdrawals((previous) =>
          sortWithdrawals(
            previous.map((item) => (item.id === id ? updated : item))
          )
        );
        setError(null);

        return { ok: true, withdrawal: updated };
      } catch {
        return {
          ok: false,
          message: "Не удалось обработать заявку. Проверьте соединение.",
        };
      } finally {
        setProcessingId(null);
      }
    },
    [withdrawals, role]
  );

  return {
    withdrawals,
    isLoading,
    processingId,
    error,
    refresh: load,
    decide,
  };
}
