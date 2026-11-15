"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  adminRequestHeaders,
  type AdminRole,
  type AdminUserDetail,
  type AdminUserSummary,
} from "@/lib/admin";
import {
  adminBalanceAdjustmentSchema,
  type AdminBalanceAdjustmentInput,
} from "@/lib/validation/admin";

type UsersResponse = {
  users?: AdminUserSummary[];
  detail?: AdminUserDetail;
};

export type AdminUserResult =
  | { ok: true; detail: AdminUserDetail }
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

export function useAdminUsers(role: AdminRole = "owner") {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadUsers = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch("/api/admin/users", {
        cache: "no-store",
        headers: adminRequestHeaders(role),
      });
      const body = await readJson(response);

      if (!response.ok) {
        throw new Error(
          readErrorMessage(body, "Не удалось загрузить пользователей")
        );
      }

      if (mountedRef.current) {
        setUsers((body as UsersResponse)?.users ?? []);
        setError(null);
      }
    } catch (requestError) {
      if (mountedRef.current) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Не удалось загрузить пользователей"
        );
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [role]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const search = useCallback(
    async (uid: number): Promise<AdminUserResult> => {
      setIsSearching(true);

      try {
        const response = await fetch(
          `/api/admin/users?uid=${encodeURIComponent(uid)}`,
          { cache: "no-store", headers: adminRequestHeaders(role) }
        );
        const body = await readJson(response);

        if (!response.ok) {
          return {
            ok: false,
            message: readErrorMessage(body, "Пользователь не найден"),
          };
        }

        const payload = body as UsersResponse;

        if (!payload?.detail) {
          return { ok: false, message: "Пользователь не найден" };
        }

        if (mountedRef.current) {
          setDetail(payload.detail);
          setError(null);
        }

        return { ok: true, detail: payload.detail };
      } catch {
        return {
          ok: false,
          message: "Не удалось найти пользователя. Проверьте соединение.",
        };
      } finally {
        if (mountedRef.current) {
          setIsSearching(false);
        }
      }
    },
    [role]
  );

  const adjust = useCallback(
    async (
      uid: number,
      input: AdminBalanceAdjustmentInput
    ): Promise<AdminUserResult> => {
      const parsed = adminBalanceAdjustmentSchema.safeParse(input);

      if (!parsed.success) {
        return {
          ok: false,
          message:
            parsed.error.issues[0]?.message ?? "Проверьте данные корректировки",
        };
      }

      setIsSubmitting(true);

      try {
        const response = await fetch(`/api/admin/users/${uid}/balance`, {
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
            message: readErrorMessage(body, "Не удалось изменить баланс"),
          };
        }

        const payload = body as UsersResponse;

        if (!payload?.detail) {
          return { ok: false, message: "Не удалось изменить баланс" };
        }

        if (mountedRef.current) {
          setDetail(payload.detail);
          setUsers((previous) =>
            previous.map((user) =>
              user.uid === payload.detail?.user.uid
                ? payload.detail.user
                : user
            )
          );
          setError(null);
        }

        return { ok: true, detail: payload.detail };
      } catch {
        return {
          ok: false,
          message: "Не удалось изменить баланс. Проверьте соединение.",
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
    users,
    detail,
    isLoading,
    isSearching,
    isSubmitting,
    error,
    refresh: loadUsers,
    search,
    adjust,
    clearDetail: () => setDetail(null),
  };
}
