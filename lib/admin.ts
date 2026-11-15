import type { PublicTrade } from "@/lib/trading";

export const adminRoles = [
  "owner",
  "senior_admin",
  "manager",
  "support",
] as const;

export type AdminRole = (typeof adminRoles)[number];

export const adminRoleLabels: Record<AdminRole, string> = {
  owner: "Владелец",
  senior_admin: "Старший админ",
  manager: "Менеджер",
  support: "Саппорт",
};

export const adminStaffNames: Record<AdminRole, string> = {
  owner: "Алексей Морозов",
  senior_admin: "Дмитрий Соколов",
  manager: "Ирина Волкова",
  support: "Мария Ким",
};

export const adminRoleDescriptions: Record<AdminRole, string> = {
  owner: "Полный доступ ко всем разделам и финансам",
  senior_admin: "Полный доступ ко всем разделам и финансам",
  manager: "Заявки на вывод, промокоды и поддержка без правки балансов",
  support:
    "Просмотр пользователей и работа с обращениями без денежных операций",
};

export type AdminPermissions = {
  canViewUsers: boolean;
  canAdjustBalances: boolean;
  canManageWithdrawals: boolean;
  canManageLimits: boolean;
  canManagePromos: boolean;
  canManageSupport: boolean;
  canViewAudit: boolean;
};

export function getAdminPermissions(role: AdminRole): AdminPermissions {
  if (role === "owner" || role === "senior_admin") {
    return {
      canViewUsers: true,
      canAdjustBalances: true,
      canManageWithdrawals: true,
      canManageLimits: true,
      canManagePromos: true,
      canManageSupport: true,
      canViewAudit: true,
    };
  }

  if (role === "manager") {
    return {
      canViewUsers: true,
      canAdjustBalances: false,
      canManageWithdrawals: true,
      canManageLimits: false,
      canManagePromos: true,
      canManageSupport: true,
      canViewAudit: true,
    };
  }

  return {
    canViewUsers: true,
    canAdjustBalances: false,
    canManageWithdrawals: false,
    canManageLimits: false,
    canManagePromos: false,
    canManageSupport: true,
    canViewAudit: false,
  };
}

export function isAdminRole(value: unknown): value is AdminRole {
  return (
    typeof value === "string" &&
    (adminRoles as readonly string[]).includes(value)
  );
}

export function resolveAdminRole(value: string | null | undefined): AdminRole {
  if (value == null || value === "") {
    return "owner";
  }

  return isAdminRole(value) ? value : "support";
}

export type AdminActor = {
  role: AdminRole;
  name: string;
  permissions: AdminPermissions;
};

export function createAdminActor(value: string | null | undefined): AdminActor {
  const role = resolveAdminRole(value);

  return {
    role,
    name: adminStaffNames[role],
    permissions: getAdminPermissions(role),
  };
}

export const ADMIN_ROLE_HEADER = "x-admin-role";

export function adminRequestHeaders(role: AdminRole): Record<string, string> {
  return { [ADMIN_ROLE_HEADER]: role };
}

export const adminAuditActions = [
  "balance_adjustment",
  "withdrawal_paid",
  "withdrawal_rejected",
  "promo_created",
  "promo_updated",
  "limits_updated",
] as const;

export type AdminAuditAction = (typeof adminAuditActions)[number];

export const adminAuditActionLabels: Record<AdminAuditAction, string> = {
  balance_adjustment: "Корректировка баланса",
  withdrawal_paid: "Выплата заявки",
  withdrawal_rejected: "Отклонение заявки",
  promo_created: "Создание промокода",
  promo_updated: "Изменение промокода",
  limits_updated: "Изменение лимитов",
};

export interface AdminAuditRecord {
  id: string;
  createdAt: string;
  staffRole: AdminRole;
  staffName: string;
  action: AdminAuditAction;
  summary: string;
  targetType: "account" | "withdrawal" | "promo" | "settings";
  targetId: string;
  uid?: number;
  amount?: number;
  previousDemoBalance?: number;
  previousRealBalance?: number;
  newDemoBalance?: number;
  newRealBalance?: number;
}

export type AdminUserSummary = {
  id: string;
  uid: number;
  demoBalance: number;
  realBalance: number;
  totalBalance: number;
  withdrawalReserved: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminOperationType = "deposit" | "withdrawal" | "bonus";

export type AdminOperation = {
  id: string;
  type: AdminOperationType;
  title: string;
  amount: number;
  status: string;
  statusLabel: string;
  createdAt: string;
  details: string | null;
};

export type AdminUserDetail = {
  user: AdminUserSummary;
  trades: PublicTrade[];
  operations: AdminOperation[];
};

export type AdminPromoCodeView = {
  id: string;
  code: string;
  bonusAmount: number;
  status: "active" | "disabled";
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminPromoState = {
  promos: AdminPromoCodeView[];
  wageringPercent: number;
};

export type AdminLimitsState = {
  limits: {
    minStake: number;
    maxStake: number;
    withdrawalMin: number;
    withdrawalMax: number;
  };
};

export type AdminAuditState = {
  entries: AdminAuditRecord[];
};
