"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { SupportState, SupportTicket } from "@/lib/support";
import {
  supportMessageSchema,
  type SupportMessageInput,
} from "@/lib/validation/support";

const POLL_INTERVAL_MS = 15_000;

type SupportResponse = {
  tickets: SupportTicket[];
};

export type SupportActionResult = { ok: true } | { ok: false; message: string };

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

function sortTickets(tickets: SupportTicket[]): SupportTicket[] {
  return [...tickets].sort((left, right) => {
    const leftOpen = left.status !== "closed";
    const rightOpen = right.status !== "closed";

    if (leftOpen !== rightOpen) {
      return leftOpen ? -1 : 1;
    }

    return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
  });
}

export function useSupport() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
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
      const response = await fetch("/api/support", { cache: "no-store" });
      const body = await readJson(response);

      if (!response.ok) {
        throw new Error(
          readErrorMessage(body, "Не удалось загрузить переписку")
        );
      }

      if (mountedRef.current) {
        const payload = body as SupportResponse;
        setTickets(sortTickets(payload?.tickets ?? []));
        setError(null);
      }
    } catch (requestError) {
      if (mountedRef.current) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Не удалось загрузить переписку"
        );
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();

    const timer = window.setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [load]);

  const sendMessage = useCallback(
    async (input: SupportMessageInput): Promise<SupportActionResult> => {
      const parsed = supportMessageSchema.safeParse(input);

      if (!parsed.success) {
        return {
          ok: false,
          message: parsed.error.issues[0]?.message ?? "Проверьте сообщение",
        };
      }

      setIsSending(true);

      try {
        const response = await fetch("/api/support", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });
        const body = await readJson(response);

        if (!response.ok) {
          return {
            ok: false,
            message: readErrorMessage(body, "Не удалось отправить сообщение"),
          };
        }

        if (mountedRef.current) {
          const payload = body as SupportState;
          setTickets(sortTickets(payload?.tickets ?? []));
          setError(null);
        }

        return { ok: true };
      } catch {
        return {
          ok: false,
          message: "Не удалось отправить сообщение. Проверьте соединение.",
        };
      } finally {
        if (mountedRef.current) {
          setIsSending(false);
        }
      }
    },
    []
  );

  const closeTicket = useCallback(
    async (id: string): Promise<SupportActionResult> => {
      setClosingId(id);

      try {
        const response = await fetch(`/api/support/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "close" }),
        });
        const body = await readJson(response);

        if (!response.ok) {
          return {
            ok: false,
            message: readErrorMessage(body, "Не удалось закрыть обращение"),
          };
        }

        if (mountedRef.current) {
          const payload = body as SupportState;
          setTickets(sortTickets(payload?.tickets ?? []));
          setError(null);
        }

        return { ok: true };
      } catch {
        return {
          ok: false,
          message: "Не удалось закрыть обращение. Проверьте соединение.",
        };
      } finally {
        if (mountedRef.current) {
          setClosingId(null);
        }
      }
    },
    []
  );

  return {
    tickets,
    isLoading,
    isSending,
    closingId,
    error,
    refresh: load,
    sendMessage,
    closeTicket,
  };
}
