"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  adminRequestHeaders,
  type AdminAuditRecord,
  type AdminRole,
} from "@/lib/admin";

type AuditResponse = {
  entries?: AdminAuditRecord[];
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

export function useAdminAudit(role: AdminRole = "owner") {
  const [entries, setEntries] = useState<AdminAuditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
      const response = await fetch("/api/admin/audit", {
        cache: "no-store",
        headers: adminRequestHeaders(role),
      });
      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          readErrorMessage(body, "Не удалось загрузить журнал")
        );
      }

      if (mountedRef.current) {
        setEntries((body as AuditResponse)?.entries ?? []);
        setError(null);
      }
    } catch (requestError) {
      if (mountedRef.current) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Не удалось загрузить журнал"
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

  return {
    entries,
    isLoading,
    error,
    refresh,
  };
}
