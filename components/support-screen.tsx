"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  History,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  WifiOff,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupport } from "@/hooks/use-support";
import {
  supportMessageMaxLength,
  supportTicketStatusLabels,
  type SupportMessage,
  type SupportTicket,
  type SupportTicketStatus,
} from "@/lib/support";
import { supportMessageSchema } from "@/lib/validation/support";
import { cn } from "@/lib/utils";

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const statusStyles: Record<
  SupportTicketStatus,
  { badge: string; icon: string; dot: string }
> = {
  new: {
    badge: "bg-amber-400/10 text-amber-300",
    icon: "bg-amber-400/10 text-amber-300 ring-amber-400/25",
    dot: "bg-amber-300",
  },
  in_progress: {
    badge: "bg-emerald-400/10 text-emerald-300",
    icon: "bg-emerald-400/10 text-emerald-400 ring-emerald-400/25",
    dot: "bg-emerald-400",
  },
  closed: {
    badge: "bg-white/5 text-muted-foreground",
    icon: "bg-white/5 text-muted-foreground ring-white/10",
    dot: "bg-muted-foreground",
  },
};

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function StatusBadge({ status }: { status: SupportTicketStatus }) {
  const styles = statusStyles[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
        styles.badge
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", styles.dot)} />
      {supportTicketStatusLabels[status]}
    </span>
  );
}

function MessageBubble({ message }: { message: SupportMessage }) {
  const isUser = message.author === "user";

  return (
    <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
      {!isUser ? (
        <span className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          <ShieldCheck className="h-2.5 w-2.5 text-emerald-400" />
          {message.authorName ?? "Поддержка"}
        </span>
      ) : null}
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ring-1",
          isUser
            ? "rounded-br-sm bg-emerald-500/15 text-emerald-50 ring-emerald-400/25"
            : "rounded-bl-sm bg-white/[0.04] text-foreground ring-white/10"
        )}
      >
        {message.body}
      </div>
      <span className="mt-1 text-[9px] text-muted-foreground">
        {formatDateTime(message.createdAt)}
      </span>
    </div>
  );
}

function MessageThread({ ticket }: { ticket: SupportTicket }) {
  return (
    <div className="space-y-3">
      {ticket.messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-2 py-2">
      {[0, 1].map((index) => (
        <Skeleton key={index} className="h-14 w-full rounded-xl bg-white/10" />
      ))}
    </div>
  );
}

function EmptyHistory() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-muted-foreground ring-1 ring-white/10">
        <History className="h-4 w-4" />
      </div>
      <p className="text-xs text-muted-foreground">
        Закрытых обращений пока нет
      </p>
      <p className="text-[10px] leading-relaxed text-muted-foreground/70">
        После закрытия переписка останется здесь.
      </p>
    </div>
  );
}

export function SupportScreen() {
  const {
    tickets,
    isLoading,
    isSending,
    closingId,
    error,
    refresh,
    sendMessage,
    closeTicket,
  } = useSupport();
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeTicket = tickets.find((ticket) => ticket.status !== "closed");
  const closedTickets = tickets.filter((ticket) => ticket.status === "closed");
  const showHistorySkeleton = isLoading && closedTickets.length === 0;

  const handleSend = async () => {
    const parsed = supportMessageSchema.safeParse({ message });

    if (!parsed.success) {
      const text = parsed.error.issues[0]?.message ?? "Введите сообщение";
      setFormError(text);
      toast.error(text);
      return;
    }

    const result = await sendMessage(parsed.data);

    if (!result.ok) {
      setFormError(result.message);
      toast.error(result.message);
      return;
    }

    setMessage("");
    setFormError(null);
    toast.success(activeTicket ? "Сообщение отправлено" : "Обращение создано");
  };

  const runClose = async (id: string) => {
    const result = await closeTicket(id);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    setExpandedId(id);
    toast.success("Обращение закрыто");
  };

  const handleClose = (id: string) => {
    toast("Закрыть обращение?", {
      description: "Переписка сохранится в истории.",
      action: {
        label: "Закрыть",
        onClick: () => {
          void runClose(id);
        },
      },
      cancel: { label: "Отмена", onClick: () => {} },
    });
  };

  return (
    <div className="relative min-h-[calc(100dvh-6rem)] overflow-hidden bg-[#050807]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% -5%, rgba(16,185,129,0.14), transparent 45%), radial-gradient(circle at 85% 8%, rgba(56,189,248,0.07), transparent 35%)",
        }}
      />
      <div className="relative mx-auto flex w-full max-w-md flex-col gap-3 px-3 pb-6 pt-3">
        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-2.5 py-1.5">
            <WifiOff className="h-3 w-3 shrink-0 text-amber-300" />
            <span className="flex-1 text-[10px] leading-tight text-amber-100/80">
              {error}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => void refresh()}
              className="h-6 px-1.5 text-[10px] text-amber-200 hover:bg-amber-400/10 hover:text-amber-100"
            >
              <RefreshCw className="h-3 w-3" />
              Повторить
            </Button>
          </div>
        ) : null}

        <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10 duration-500">
          <CardContent className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/25">
              <MessageCircle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Поддержка
              </p>
              <p className="text-base font-semibold leading-tight text-foreground">
                Чат со специалистом
              </p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                Опишите проблему — обращение попадёт в работу, ответ появится в
                этом чате.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10 duration-500">
          <CardContent className="space-y-3 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {activeTicket ? "Текущее обращение" : "Новое обращение"}
              </p>
              {activeTicket ? (
                <StatusBadge status={activeTicket.status} />
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-emerald-300">
                  <MessageCircle className="h-2.5 w-2.5" />
                  Напишем первыми
                </span>
              )}
            </div>

            {activeTicket ? (
              <>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
                  <span>{formatDateTime(activeTicket.createdAt)}</span>
                  {activeTicket.assignedTo ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>Специалист: {activeTicket.assignedTo}</span>
                    </>
                  ) : null}
                </div>
                <Separator className="bg-white/10" />
                <div className="max-h-[45vh] overflow-y-auto pr-1">
                  <MessageThread ticket={activeTicket} />
                </div>
                {activeTicket.status === "in_progress" ? (
                  <div className="flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    <p className="text-[10px] leading-relaxed text-emerald-100/80">
                      Обращение взято в работу. Ответ специалиста появится в
                      этом чате.
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
                Отправьте сообщение — мы создадим новое обращение и передадим
                его специалисту.
              </p>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="support-message"
                className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground"
              >
                {activeTicket ? "Сообщение в поддержку" : "Опишите ваш вопрос"}
              </label>
              <textarea
                id="support-message"
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value);
                  setFormError(null);
                }}
                rows={3}
                maxLength={supportMessageMaxLength}
                placeholder="Напишите сообщение…"
                className={cn(
                  "w-full resize-none rounded-lg border bg-white/[0.02] px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40",
                  formError ? "border-rose-400/50" : "border-white/10"
                )}
              />
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    "text-[10px] leading-tight",
                    formError ? "text-rose-300" : "text-muted-foreground"
                  )}
                >
                  {formError ?? `${message.length}/${supportMessageMaxLength}`}
                </p>
                <Button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={isSending || !message.trim()}
                  className="h-9 rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-emerald-950 hover:bg-emerald-400"
                >
                  {isSending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Отправить
                </Button>
              </div>
            </div>

            {activeTicket ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(activeTicket.id)}
                disabled={closingId === activeTicket.id}
                className="h-9 w-full rounded-lg border-white/10 bg-white/[0.02] text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground"
              >
                {closingId === activeTicket.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                Закрыть обращение
              </Button>
            ) : null}

            <p className="text-center text-[10px] leading-relaxed text-muted-foreground/70">
              Чат обновляется автоматически. После закрытия переписка остаётся в
              истории.
            </p>
          </CardContent>
        </Card>

        <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10 duration-500">
          <CardContent className="px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                История обращений
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <History className="h-3 w-3" />
                {isLoading && closedTickets.length === 0
                  ? "…"
                  : closedTickets.length}
              </span>
            </div>
            <Separator className="bg-white/10" />

            {showHistorySkeleton ? (
              <HistorySkeleton />
            ) : closedTickets.length === 0 ? (
              <EmptyHistory />
            ) : (
              <div className="divide-y divide-white/5 pt-1">
                {closedTickets.map((ticket) => {
                  const isExpanded = expandedId === ticket.id;
                  const lastMessage =
                    ticket.messages[ticket.messages.length - 1];

                  return (
                    <div key={ticket.id} className="py-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : ticket.id)
                        }
                        className="flex w-full items-start gap-2.5 text-left"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-muted-foreground ring-1 ring-white/10">
                          <History className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-xs font-semibold text-foreground">
                              Обращение
                            </span>
                            <StatusBadge status={ticket.status} />
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                            {lastMessage
                              ? lastMessage.body
                              : "Сообщений не было"}
                          </span>
                          <span className="block text-[9px] text-muted-foreground/70">
                            Закрыто{" "}
                            {ticket.closedAt
                              ? formatDateTime(ticket.closedAt)
                              : formatDateTime(ticket.updatedAt)}
                          </span>
                        </span>
                        <ChevronDown
                          className={cn(
                            "mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </button>

                      {isExpanded ? (
                        <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
                          <MessageThread ticket={ticket} />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
