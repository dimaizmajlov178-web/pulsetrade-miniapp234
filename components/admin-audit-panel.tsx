"use client";

import {
  History,
  RefreshCw,
  ShieldCheck,
  WifiOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAudit } from "@/hooks/use-admin-audit";
import {
  adminAuditActionLabels,
  adminRoleLabels,
  type AdminRole,
} from "@/lib/admin";
import { formatUsdt } from "@/lib/trading";
import { cn } from "@/lib/utils";

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function actionTone(action: keyof typeof adminAuditActionLabels) {
  if (action === "withdrawal_rejected") {
    return "bg-rose-400/10 text-rose-300";
  }

  if (action === "balance_adjustment" || action === "withdrawal_paid") {
    return "bg-emerald-400/10 text-emerald-300";
  }

  return "bg-sky-400/10 text-sky-300";
}

export function AdminAuditPanel({ role }: { role: AdminRole }) {
  const { entries, isLoading, error, refresh } = useAdminAudit(role);

  return (
    <div className="space-y-3">
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

      <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10 duration-300">
        <CardContent className="space-y-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/25">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Журнал действий
              </p>
              <p className="text-sm font-semibold text-foreground">
                Кто, когда и что изменил
              </p>
            </div>
          </div>

          {isLoading && entries.length === 0 ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-xl bg-white/10" />
              <Skeleton className="h-16 w-full rounded-xl bg-white/10" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-muted-foreground ring-1 ring-white/10">
                <History className="h-4 w-4" />
              </div>
              <p className="text-xs text-muted-foreground">
                Действий с деньгами пока не было
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
                        actionTone(entry.action)
                      )}
                    >
                      {adminAuditActionLabels[entry.action]}
                    </span>
                    {entry.uid ? (
                      <span className="font-mono text-[9px] text-muted-foreground">
                        UID {entry.uid}
                      </span>
                    ) : null}
                    {typeof entry.amount === "number" ? (
                      <span className="ml-auto font-mono text-[10px] text-foreground/80">
                        {formatUsdt(entry.amount)} USDT
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-foreground/90">
                    {entry.summary}
                  </p>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">
                    {entry.staffName} ·{" "}
                    {adminRoleLabels[entry.staffRole] ?? entry.staffRole} ·{" "}
                    {formatDateTime(entry.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
