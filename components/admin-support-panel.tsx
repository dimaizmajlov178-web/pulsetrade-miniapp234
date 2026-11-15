"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock3,
  History,
  Loader2,
  MessageCircle,
  MessagesSquare,
  RefreshCw,
  Send,
  ShieldCheck,
  UserRound,
  WifiOff,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminRole } from "@/lib/admin";
import {
  type AdminSupportActionResult,
  useAdminSupport,
} from "@/hooks/use-admin-support";
import {
  supportMessageMaxLength,
  supportTicketStatusLabels,
  type AdminSupportTicket,
  type SupportMessage,
  type SupportTicketStatus,
} from "@/lib/support";
import {
  adminSupportActionSchema,
  type AdminSupportActionInput,
} from "@/lib/validation/support";
import { cn } from "@/lib/utils";

type Filter = "open" | "all";

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const statusStyles: Record<
  SupportTicketStatus,
  { badge: string; dot: string }
> = {
  new: {
    badge: "bg-amber-400/10 text-amber-300",
    dot: "bg-amber-300",
  },
  in_progress: {
    badge: "bg-emerald-400/10 text-emerald-300",
    dot: "bg-emerald-400",
  },
  closed: {
    badge: "bg-white/5 text-muted-foreground",
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
  const isSupport = message.author === "support";

  return (
    <div
      className={cn("flex flex-col", isSupport ? "items-end" : "items-start")}
    >
      <span className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
        {isSupport ? (
          <ShieldCheck className="h-2.5 w-2.5 text-emerald-400" />
        ) : (
          <UserRound className="h-2.5 w-2.5 text-sky-300" />
        )}
        {isSupport ? (message.authorName ?? "Поддержка") : "Пользователь"}
      </span>
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ring-1",
          isSupport
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

function SupportTicketCard({
  ticket,
  isProcessing,
  canManage,
  onAct,
}: {
  ticket: AdminSupportTicket;
  isProcessing: boolean;
  canManage: boolean;
  onAct: (action: AdminSupportActionInput) => Promise<AdminSupportActionResult>;
}) {
  const [reply, setReply] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);
  const isClosed = ticket.status === "closed";

  const runAction = async (action: AdminSupportActionInput) => {
    const result = await onAct(action);

    if (!result.ok) {
      toast.error(result.message);
      return false;
    }

    return true;
  };

  const handleTake = async () => {
    const ok = await runAction({ action: "take" });

    if (ok) {
      toast.success("Обращение взято в работу");
    }
  };

  const handleReply = async () => {
    const parsed = adminSupportActionSchema.safeParse({
      action: "reply",
      message: reply,
    });

    if (!parsed.success) {
      const text = parsed.error.issues[0]?.message ?? "Введите ответ";
      setReplyError(text);
      toast.error(text);
      return;
    }

    const ok = await runAction(parsed.data);

    if (ok) {
      setReply("");
      setReplyError(null);
      toast.success("Ответ отправлен пользователю");
    }
  };

  const handleClose = () => {
    toast("Закрыть обращение?", {
      description: "Пользователь увидит переписку в истории.",
      action: {
        label: "Закрыть",
        onClick: () => {
          void runAction({ action: "close" }).then((ok) => {
            if (ok) {
              toast.success("Обращение закрыто");
            }
          });
        },
      },
      cancel: { label: "Отмена", onClick: () => {} },
    });
  };

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10 duration-300">
      <CardContent className="space-y-3 px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/25">
            <MessageCircle className="h-4 w-4" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-sm font-semibold text-foreground">
                Обращение {ticket.id.slice(0, 8)}
              </p>
              <StatusBadge status={ticket.status} />
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground">
              <span className="font-mono">UID {ticket.uid}</span>
              <span aria-hidden>·</span>
              <span>{formatDateTime(ticket.createdAt)}</span>
            </div>
            {ticket.assignedTo ? (
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                В работе: {ticket.assignedTo}
              </p>
            ) : null}
          </div>
        </div>

        <div className="max-h-[50vh] space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
          {ticket.messages.length === 0 ? (
            <p className="py-2 text-center text-[10px] text-muted-foreground">
              Сообщений пока нет
            </p>
          ) : (
            ticket.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
        </div>

        {isClosed ? (
          <p className="text-[10px] text-muted-foreground">
            Закрыто{" "}
            {ticket.closedAt
              ? formatDateTime(ticket.closedAt)
              : formatDateTime(ticket.updatedAt)}
            . Переписка доступна в истории пользователя.
          </p>
        ) : !canManage ? (
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2">
            <p className="text-[10px] leading-relaxed text-amber-100/80">
              Ваша роль позволяет просматривать обращения, но не отвечать на
              них.
            </p>
          </div>
        ) : (
          <>
            {ticket.status === "new" ? (
              <Button
                type="button"
                onClick={() => void handleTake()}
                disabled={isProcessing}
                className="h-9 w-full rounded-lg bg-emerald-500 text-xs font-semibold text-emerald-950 hover:bg-emerald-400"
              >
                {isProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Clock3 className="h-3.5 w-3.5" />
                )}
                Взять в работу
              </Button>
            ) : null}

            <div className="space-y-1.5">
              <label
                htmlFor={`support-reply-${ticket.id}`}
                className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground"
              >
                Ответ пользователю
              </label>
              <textarea
                id={`support-reply-${ticket.id}`}
                value={reply}
                onChange={(event) => {
                  setReply(event.target.value);
                  setReplyError(null);
                }}
                rows={3}
                maxLength={supportMessageMaxLength}
                placeholder="Напишите ответ…"
                className={cn(
                  "w-full resize-none rounded-lg border bg-white/[0.02] px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40",
                  replyError ? "border-rose-400/50" : "border-white/10"
                )}
              />
              <p
                className={cn(
                  "text-[10px] leading-tight",
                  replyError ? "text-rose-300" : "text-muted-foreground"
                )}
              >
                {replyError ?? `${reply.length}/${supportMessageMaxLength}`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                onClick={() => void handleReply()}
                disabled={isProcessing || !reply.trim()}
                className="h-9 rounded-lg bg-emerald-500 text-xs font-semibold text-emerald-950 hover:bg-emerald-400"
              >
                {isProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Ответить
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isProcessing}
                className="h-9 rounded-lg border-white/10 bg-white/[0.02] text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground"
              >
                <XCircle className="h-3.5 w-3.5" />
                Закрыть
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card className="gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10">
      <CardContent className="space-y-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl bg-white/10" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-2/3 bg-white/10" />
            <Skeleton className="h-2.5 w-1/2 bg-white/10" />
          </div>
        </div>
        <Skeleton className="h-20 w-full rounded-xl bg-white/10" />
        <Skeleton className="h-9 w-full rounded-lg bg-white/10" />
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-muted-foreground ring-1 ring-white/10">
        <MessagesSquare className="h-4 w-4" />
      </div>
      <p className="text-xs text-muted-foreground">Обращений пока нет</p>
      <p className="text-[10px] leading-relaxed text-muted-foreground/70">
        Новые сообщения пользователей появятся здесь автоматически.
      </p>
    </div>
  );
}

export function AdminSupportPanel({
  role = "owner",
  canManageSupport = true,
  embedded = false,
}: {
  role?: AdminRole;
  canManageSupport?: boolean;
  embedded?: boolean;
}) {
  const { tickets, isLoading, processingId, error, refresh, act } =
    useAdminSupport(role);
  const [filter, setFilter] = useState<Filter>("open");

  const newCount = tickets.filter((ticket) => ticket.status === "new").length;
  const inProgressCount = tickets.filter(
    (ticket) => ticket.status === "in_progress"
  ).length;
  const closedCount = tickets.filter(
    (ticket) => ticket.status === "closed"
  ).length;
  const ordered =
    filter === "open"
      ? tickets.filter((ticket) => ticket.status !== "closed")
      : tickets;
  const showSkeleton = isLoading && tickets.length === 0;

  return (
    <div className="relative overflow-hidden bg-[#050807]">
      <div className="relative mx-auto flex w-full flex-col gap-3 pb-1">
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

        {embedded ? null : (
          <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10 duration-500">
            <CardContent className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/25">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Панель сотрудника
                </p>
                <p className="text-base font-semibold leading-tight text-foreground">
                  Обращения поддержки
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Новые тикеты, ответы и закрытие обращений
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Card className="gap-0 rounded-xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-amber-400/20">
            <CardContent className="px-3 py-2.5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                Новые
              </p>
              <p className="font-mono text-lg font-semibold leading-tight text-amber-300">
                {newCount}
              </p>
              <p className="text-[9px] text-muted-foreground">тикетов</p>
            </CardContent>
          </Card>
          <Card className="gap-0 rounded-xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-emerald-400/20">
            <CardContent className="px-3 py-2.5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                В работе
              </p>
              <p className="font-mono text-lg font-semibold leading-tight text-emerald-400">
                {inProgressCount}
              </p>
              <p className="text-[9px] text-muted-foreground">тикетов</p>
            </CardContent>
          </Card>
          <Card className="gap-0 rounded-xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10">
            <CardContent className="px-3 py-2.5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                Закрыто
              </p>
              <p className="font-mono text-lg font-semibold leading-tight text-muted-foreground">
                {closedCount}
              </p>
              <p className="text-[9px] text-muted-foreground">тикетов</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setFilter("open")}
            className={cn(
              "h-9 rounded-lg border text-xs font-semibold",
              filter === "open"
                ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15"
                : "border-white/10 bg-white/[0.02] text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}
          >
            <Clock3 className="h-3.5 w-3.5" />
            Открытые
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setFilter("all")}
            className={cn(
              "h-9 rounded-lg border text-xs font-semibold",
              filter === "all"
                ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15"
                : "border-white/10 bg-white/[0.02] text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}
          >
            <History className="h-3.5 w-3.5" />
            Все обращения
          </Button>
        </div>

        {showSkeleton ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : ordered.length === 0 ? (
          <Card className="gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10">
            <CardContent className="px-4 py-3">
              <EmptyState />
            </CardContent>
          </Card>
        ) : (
          ordered.map((ticket) => (
            <SupportTicketCard
              key={ticket.id}
              ticket={ticket}
              isProcessing={processingId === ticket.id}
              canManage={canManageSupport}
              onAct={(action) => act(ticket.id, action)}
            />
          ))
        )}

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          Ответы и закрытие сохраняются в истории пользователя
        </div>

        <Separator className="bg-white/5" />
        <p className="text-center text-[10px] leading-relaxed text-muted-foreground/70">
          Ответьте пользователю в тикете — переписка сохранится в его истории.
        </p>
      </div>
    </div>
  );
}
