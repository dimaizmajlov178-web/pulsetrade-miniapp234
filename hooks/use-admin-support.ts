"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { adminRequestHeaders, type AdminRole } from "@/lib/admin";
import type { AdminSupportTicket } from "@/lib/support";
import {
  adminSupportActionSchema,
  type AdminSupportActionInput,
} from "@/lib/validation/support";

const POLL_INTERVAL_MS = 15_000;

type AdminSupportResponse = {
  tickets: AdminSupportTicket[];
};

type AdminSupportTicketResponse = {
  ticket?: AdminSupportTicket;
};

export type AdminSupportActionResult =
  { ok: true; ticket: AdminSupportTicket } | { ok: false; message: string };

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

function statusPriority(status: AdminSupportTicket["status"]): number {
  if (status === "new") {
    return 0;
  }

  if (status === "in_progress") {
    return 1;
  }

  return 2;
}

function sortTickets(tickets: AdminSupportTicket[]): AdminSupportTicket[] {
  return [...tickets].sort((left, right) => {
    const priority = statusPriority(left.status) - statusPriority(right.status);

    if (priority !== 0) {
      return priority;
    }

    return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
  });
}

export function useAdminSupport(role: AdminRole = "owner") {
  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch("/api/admin/support", {
        cache: "no-store",
        headers: adminRequestHeaders(role),
      });
      const body = await readJson(response);

      if (!response.ok) {
        throw new Error(
          readErrorMessage(body, "Не удалось загрузить обращения")
        );
      }

      if (mountedRef.current) {
        const payload = body as AdminSupportResponse;
        setTickets(sortTickets(payload?.tickets ?? []));
        setError(null);
      }
    } catch (requestError) {
      if (mountedRef.current) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Не удалось загрузить обращения"
        );
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [role]);

  useEffect(() => {
    void load();

    const timer = window.setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [load]);

  const act = useCallback(
    async (
      id: string,
      action: AdminSupportActionInput
    ): Promise<AdminSupportActionResult> => {
      const parsed = adminSupportActionSchema.safeParse(action);

      if (!parsed.success) {
        return {
          ok: false,
          message:
            parsed.error.issues[0]?.message ??
            "Проверьте данные действия с обращением",
        };
      }

      setProcessingId(id);

      try {
        const response = await fetch(`/api/admin/support/${id}`, {
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
            message: readErrorMessage(body, "Не удалось обработать обращение"),
          };
        }

        const payload = body as AdminSupportTicketResponse;

        const ticket = payload?.ticket;

        if (!ticket) {
          return { ok: false, message: "Не удалось обработать обращение" };
        }

        if (mountedRef.current) {
          setTickets((previous) =>
            sortTickets(
              previous.map((item) => (item.id === id ? ticket : item))
            )
          );
          setError(null);
        }

        return { ok: true, ticket };
      } catch {
        return {
          ok: false,
          message: "Не удалось обработать обращение. Проверьте соединение.",
        };
      } finally {
        if (mountedRef.current) {
          setProcessingId(null);
        }
      }
    },
    [role]
  );

  return {
    tickets,
    isLoading,
    processingId,
    error,
    refresh: load,
    act,
  };
}
