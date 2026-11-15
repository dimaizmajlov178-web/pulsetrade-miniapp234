"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ClipboardList,
  MessageCircle,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  Ticket,
  Users,
} from "lucide-react";

import { AdminAuditPanel } from "@/components/admin-audit-panel";
import { AdminLimitsPanel } from "@/components/admin-limits-panel";
import { AdminPromosPanel } from "@/components/admin-promos-panel";
import { AdminSupportPanel } from "@/components/admin-support-panel";
import { AdminUsersPanel } from "@/components/admin-users-panel";
import { AdminWithdrawalsPanel } from "@/components/admin-withdrawals-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  adminRoleDescriptions,
  adminRoleLabels,
  adminRoles,
  adminStaffNames,
  getAdminPermissions,
  resolveAdminRole,
  type AdminRole,
} from "@/lib/admin";
import { cn } from "@/lib/utils";

type TabId =
  "withdrawals" | "support" | "users" | "limits" | "promos" | "audit";

const ROLE_STORAGE_KEY = "pulsetrade.admin.role";

export function AdminConsole() {
  const [role, setRole] = useState<AdminRole>(() => {
    if (typeof window === "undefined") {
      return "owner";
    }

    try {
      return resolveAdminRole(window.localStorage.getItem(ROLE_STORAGE_KEY));
    } catch {
      return "owner";
    }
  });
  const [tab, setTab] = useState<TabId>("withdrawals");

  const permissions = useMemo(() => getAdminPermissions(role), [role]);

  const tabs = useMemo(
    () =>
      [
        {
          id: "withdrawals" as const,
          label: "Заявки",
          icon: ClipboardList,
          visible: true,
        },
        {
          id: "support" as const,
          label: "Поддержка",
          icon: MessageCircle,
          visible: permissions.canManageSupport,
        },
        {
          id: "users" as const,
          label: "Пользователи",
          icon: Users,
          visible: permissions.canViewUsers,
        },
        {
          id: "limits" as const,
          label: "Лимиты",
          icon: SlidersHorizontal,
          visible: permissions.canManageLimits,
        },
        {
          id: "promos" as const,
          label: "Промокоды",
          icon: Ticket,
          visible: permissions.canManagePromos,
        },
        {
          id: "audit" as const,
          label: "Журнал",
          icon: ScrollText,
          visible: permissions.canViewAudit,
        },
      ].filter((item) => item.visible),
    [permissions]
  );

  const activeTab = tabs.some((item) => item.id === tab)
    ? tab
    : (tabs[0]?.id ?? "withdrawals");

  const handleRoleChange = (next: AdminRole) => {
    setRole(next);

    try {
      window.localStorage.setItem(ROLE_STORAGE_KEY, next);
    } catch {
      // localStorage может быть недоступен в ограниченном окружении
    }
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
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />К терминалу
        </Link>

        <Card className="animate-in fade-in slide-in-from-bottom-4 gap-0 rounded-2xl border-0 bg-[#0a0f0d] py-0 ring-1 ring-white/10 duration-500">
          <CardContent className="space-y-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/25">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Панель сотрудника
                </p>
                <p className="text-base font-semibold leading-tight text-foreground">
                  {adminRoleLabels[role]}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {adminStaffNames[role]} · {adminRoleDescriptions[role]}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {adminRoles.map((item) => {
                const isActive = item === role;

                return (
                  <Button
                    key={item}
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => handleRoleChange(item)}
                    className={cn(
                      "h-8 justify-start rounded-lg border px-2 text-[10px] font-semibold",
                      isActive
                        ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15"
                        : "border-white/10 bg-white/[0.02] text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )}
                  >
                    {adminRoleLabels[item]}
                  </Button>
                );
              })}
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Доступ к разделам и денежным действиям ограничен выбранной ролью.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          {tabs.map((item) => {
            const isActive = item.id === activeTab;
            const Icon = item.icon;

            return (
              <Button
                key={item.id}
                type="button"
                variant="outline"
                onClick={() => setTab(item.id)}
                className={cn(
                  "h-9 justify-start gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold",
                  isActive
                    ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15"
                    : "border-white/10 bg-white/[0.02] text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Button>
            );
          })}
        </div>

        {activeTab === "withdrawals" ? (
          <AdminWithdrawalsPanel
            role={role}
            canManageWithdrawals={permissions.canManageWithdrawals}
            embedded
          />
        ) : null}

        {activeTab === "support" ? (
          <AdminSupportPanel
            role={role}
            canManageSupport={permissions.canManageSupport}
            embedded
          />
        ) : null}

        {activeTab === "users" ? (
          <AdminUsersPanel
            role={role}
            canAdjustBalances={permissions.canAdjustBalances}
          />
        ) : null}

        {activeTab === "limits" ? (
          <AdminLimitsPanel
            role={role}
            canManageLimits={permissions.canManageLimits}
          />
        ) : null}

        {activeTab === "promos" ? (
          <AdminPromosPanel
            role={role}
            canManagePromos={permissions.canManagePromos}
          />
        ) : null}

        {activeTab === "audit" ? <AdminAuditPanel role={role} /> : null}
      </div>
    </div>
  );
}
