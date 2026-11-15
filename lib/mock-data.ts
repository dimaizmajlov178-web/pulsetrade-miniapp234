// Мок-данные для статического режима (без БД)
// Используются когда USE_DATABASE=false или БД недоступна

import type {
  AdminAuditState,
  AdminLimitsState,
  AdminPromoState,
  AdminUserDetail,
  AdminUserSummary,
} from "./admin";
import type { PublicDeposit } from "./deposits";
import type { Service } from "./models";
import { buildReferralLink, type ReferralState } from "./referrals";
import type { PublicBonusActivation } from "./promo";
import type { AdminSupportTicket, SupportTicket } from "./support";
import type { PublicAccount, PublicTrade } from "./trading";
import type { AdminWithdrawal, PublicWithdrawal } from "./withdrawals";

export const mockServices: Service[] = [
  {
    id: "mock-service-1",
    name: "API Gateway",
    description: "Шлюз для микросервисной архитектуры",
    status: "active",
    url: "https://api.example.com",
    createdAt: new Date("2024-01-15").toISOString(),
    updatedAt: new Date("2024-01-15").toISOString(),
  },
  {
    id: "mock-service-2",
    name: "Auth Service",
    description: "Сервис аутентификации и авторизации",
    status: "active",
    url: "https://auth.example.com",
    createdAt: new Date("2024-02-01").toISOString(),
    updatedAt: new Date("2024-02-01").toISOString(),
  },
  {
    id: "mock-service-3",
    name: "ML Pipeline",
    description: "Пайплайн для обработки данных с AI",
    status: "deploying",
    url: undefined,
    createdAt: new Date("2024-03-10").toISOString(),
    updatedAt: new Date("2024-03-10").toISOString(),
  },
];

export const mockAccount: PublicAccount = {
  uid: 624839,
  balance: 1248.5,
  updatedAt: new Date("2024-01-01").toISOString(),
};

export const mockWageringPercent = 100;

export const mockBonusActivations: PublicBonusActivation[] = [
  {
    id: "mock-bonus-1",
    code: "WELCOME",
    bonusAmount: 50,
    wageringPercent: 100,
    wageredAmount: 15,
    requiredWagering: 50,
    progressPercent: 30,
    status: "active",
    createdAt: new Date("2024-01-04T11:00:00Z").toISOString(),
    updatedAt: new Date("2024-01-04T11:00:00Z").toISOString(),
    completedAt: null,
  },
];

export const mockTrades: PublicTrade[] = [];

export const mockDeposits: PublicDeposit[] = [
  {
    id: "mock-deposit-1",
    amount: 250,
    currency: "USDT",
    network: "TON",
    status: "completed",
    address: null,
    memo: null,
    paymentLink: "#",
    createdAt: new Date("2024-01-02T10:15:00Z").toISOString(),
    expiresAt: new Date("2024-01-02T10:45:00Z").toISOString(),
    confirmedAt: new Date("2024-01-02T10:20:00Z").toISOString(),
  },
];

export const mockWithdrawals: PublicWithdrawal[] = [
  {
    id: "mock-withdrawal-1",
    amount: 150,
    method: "usdt",
    type: "balance",
    status: "pending",
    address: "UQD3vKX8yQzN9m5L2pR7tC4bF6hJ1sW8aE0nG5uY",
    phone: null,
    recipient: null,
    rejectionReason: null,
    createdAt: new Date("2024-01-03T09:10:00Z").toISOString(),
    updatedAt: new Date("2024-01-03T09:10:00Z").toISOString(),
    processedAt: null,
  },
  {
    id: "mock-withdrawal-2",
    amount: 200,
    method: "sbp",
    type: "balance",
    status: "paid",
    address: null,
    phone: "+7 900 123-45-67",
    recipient: "Иван Петров",
    rejectionReason: null,
    createdAt: new Date("2024-01-01T12:00:00Z").toISOString(),
    updatedAt: new Date("2024-01-01T13:30:00Z").toISOString(),
    processedAt: new Date("2024-01-01T13:30:00Z").toISOString(),
  },
  {
    id: "mock-withdrawal-3",
    amount: 100,
    method: "usdt",
    type: "balance",
    status: "rejected",
    address: "UQC8mN2vB4xZ7kL1pR9tY6wS3hJ5aD0fG8eK2uQ",
    phone: null,
    recipient: null,
    rejectionReason: "Реквизиты не прошли проверку",
    createdAt: new Date("2023-12-28T15:20:00Z").toISOString(),
    updatedAt: new Date("2023-12-28T16:05:00Z").toISOString(),
    processedAt: new Date("2023-12-28T16:05:00Z").toISOString(),
  },
];

export const mockAdminWithdrawals: AdminWithdrawal[] = mockWithdrawals.map(
  (withdrawal, index) => ({
    ...withdrawal,
    uid: mockAccount.uid + index,
  })
);

export const mockReferralState: ReferralState = {
  uid: mockAccount.uid,
  link: buildReferralLink(mockAccount.uid),
  rewardPercent: 10,
  balance: 24.5,
  availableBalance: 24.5,
  referralsCount: 3,
  isInfluencer: true,
  minWithdrawal: 10,
  withdrawals: [],
};

const mockActiveSupportTicket: SupportTicket = {
  id: "mock-support-1",
  status: "in_progress",
  subject: null,
  assignedTo: "Мария Ким",
  createdAt: new Date("2024-01-05T09:00:00Z").toISOString(),
  updatedAt: new Date("2024-01-05T09:12:00Z").toISOString(),
  closedAt: null,
  messages: [
    {
      id: "mock-support-message-1",
      author: "user",
      authorName: null,
      body: "Здравствуйте! Не пришёл вывод на USDT, хотя заявка уже обработана.",
      createdAt: new Date("2024-01-05T09:00:00Z").toISOString(),
    },
    {
      id: "mock-support-message-2",
      author: "support",
      authorName: "Мария Ким",
      body: "Добрый день! Проверяю заявку, вернусь с ответом в течение нескольких минут.",
      createdAt: new Date("2024-01-05T09:12:00Z").toISOString(),
    },
  ],
};

const mockClosedSupportTicket: SupportTicket = {
  id: "mock-support-2",
  status: "closed",
  subject: null,
  assignedTo: "Мария Ким",
  createdAt: new Date("2024-01-02T12:30:00Z").toISOString(),
  updatedAt: new Date("2024-01-02T12:48:00Z").toISOString(),
  closedAt: new Date("2024-01-02T12:48:00Z").toISOString(),
  messages: [
    {
      id: "mock-support-message-3",
      author: "user",
      authorName: null,
      body: "Как активировать промокод?",
      createdAt: new Date("2024-01-02T12:30:00Z").toISOString(),
    },
    {
      id: "mock-support-message-4",
      author: "support",
      authorName: "Мария Ким",
      body: "Промокод вводится на экране баланса. После активации бонус сразу появится на счёте.",
      createdAt: new Date("2024-01-02T12:41:00Z").toISOString(),
    },
    {
      id: "mock-support-message-5",
      author: "user",
      authorName: null,
      body: "Спасибо, всё получилось!",
      createdAt: new Date("2024-01-02T12:47:00Z").toISOString(),
    },
  ],
};

export const mockSupportTickets: SupportTicket[] = [
  mockActiveSupportTicket,
  mockClosedSupportTicket,
];

export const mockAdminSupportTickets: AdminSupportTicket[] = [
  {
    ...mockActiveSupportTicket,
    uid: mockAccount.uid,
  },
  {
    id: "mock-support-3",
    status: "new",
    subject: null,
    assignedTo: null,
    createdAt: new Date("2024-01-06T08:20:00Z").toISOString(),
    updatedAt: new Date("2024-01-06T08:20:00Z").toISOString(),
    closedAt: null,
    messages: [
      {
        id: "mock-support-message-6",
        author: "user",
        authorName: null,
        body: "Подскажите, как изменить лимит вывода?",
        createdAt: new Date("2024-01-06T08:20:00Z").toISOString(),
      },
    ],
    uid: mockAccount.uid + 1,
  },
  {
    ...mockClosedSupportTicket,
    uid: mockAccount.uid + 2,
  },
];

export const mockAdminUsers: AdminUserSummary[] = [
  {
    id: "default",
    uid: mockAccount.uid,
    demoBalance: 500,
    realBalance: 748.5,
    totalBalance: 1248.5,
    withdrawalReserved: 150,
    createdAt: new Date("2024-01-01T09:00:00Z").toISOString(),
    updatedAt: new Date("2024-01-04T11:00:00Z").toISOString(),
  },
  {
    id: "demo-account-2",
    uid: mockAccount.uid + 1,
    demoBalance: 320,
    realBalance: 1500,
    totalBalance: 1820,
    withdrawalReserved: 0,
    createdAt: new Date("2024-01-02T12:30:00Z").toISOString(),
    updatedAt: new Date("2024-01-05T08:15:00Z").toISOString(),
  },
  {
    id: "demo-account-3",
    uid: mockAccount.uid + 2,
    demoBalance: 75,
    realBalance: 240,
    totalBalance: 315,
    withdrawalReserved: 0,
    createdAt: new Date("2024-01-03T16:45:00Z").toISOString(),
    updatedAt: new Date("2024-01-03T18:20:00Z").toISOString(),
  },
];

export const mockAdminTrades: PublicTrade[] = [
  {
    id: "mock-trade-1",
    pairId: "btc",
    symbol: "BTCUSDT",
    direction: "up",
    stake: 100,
    expiryMinutes: 5,
    entryPrice: 67420.15,
    exitPrice: 67588.4,
    status: "won",
    profit: 82,
    payout: 182,
    payoutRate: 82,
    createdAt: new Date("2024-01-04T10:40:00Z").toISOString(),
    expiresAt: new Date("2024-01-04T10:45:00Z").toISOString(),
    resolvedAt: new Date("2024-01-04T10:45:02Z").toISOString(),
  },
  {
    id: "mock-trade-2",
    pairId: "eth",
    symbol: "ETHUSDT",
    direction: "down",
    stake: 50,
    expiryMinutes: 1,
    entryPrice: 3288.9,
    exitPrice: 3291.4,
    status: "lost",
    profit: 0,
    payout: 0,
    payoutRate: 82,
    createdAt: new Date("2024-01-03T20:10:00Z").toISOString(),
    expiresAt: new Date("2024-01-03T20:11:00Z").toISOString(),
    resolvedAt: new Date("2024-01-03T20:11:01Z").toISOString(),
  },
];

export const mockAdminUserDetail: AdminUserDetail = {
  user: mockAdminUsers[0],
  trades: mockAdminTrades,
  operations: [
    {
      id: "mock-bonus-1",
      type: "bonus",
      title: "Бонус WELCOME",
      amount: 50,
      status: "active",
      statusLabel: "В отыгрыше",
      createdAt: new Date("2024-01-04T11:00:00Z").toISOString(),
      details: "Отыграно 15.00 из 50.00 USDT",
    },
    {
      id: "mock-deposit-1",
      type: "deposit",
      title: "Пополнение USDT (TON)",
      amount: 250,
      status: "completed",
      statusLabel: "Зачислено",
      createdAt: new Date("2024-01-02T10:15:00Z").toISOString(),
      details: null,
    },
    {
      id: "mock-withdrawal-1",
      type: "withdrawal",
      title: "Вывод USDT",
      amount: 150,
      status: "pending",
      statusLabel: "На обработке",
      createdAt: new Date("2024-01-03T09:10:00Z").toISOString(),
      details: null,
    },
    {
      id: "mock-withdrawal-3",
      type: "withdrawal",
      title: "Вывод USDT",
      amount: 100,
      status: "rejected",
      statusLabel: "Отклонено",
      createdAt: new Date("2023-12-28T15:20:00Z").toISOString(),
      details: "Реквизиты не прошли проверку",
    },
  ],
};

export const mockAdminPromos: AdminPromoState = {
  wageringPercent: mockWageringPercent,
  promos: [
    {
      id: "WELCOME",
      code: "WELCOME",
      bonusAmount: 50,
      status: "active",
      isDefault: true,
      createdAt: new Date("2024-01-01T00:00:00Z").toISOString(),
      updatedAt: new Date("2024-01-01T00:00:00Z").toISOString(),
    },
    {
      id: "PULSE100",
      code: "PULSE100",
      bonusAmount: 100,
      status: "active",
      isDefault: true,
      createdAt: new Date("2024-01-01T00:00:00Z").toISOString(),
      updatedAt: new Date("2024-01-01T00:00:00Z").toISOString(),
    },
    {
      id: "SPRING25",
      code: "SPRING25",
      bonusAmount: 25,
      status: "disabled",
      isDefault: false,
      createdAt: new Date("2024-01-05T09:00:00Z").toISOString(),
      updatedAt: new Date("2024-01-06T14:30:00Z").toISOString(),
    },
  ],
};

export const mockAdminLimits: AdminLimitsState = {
  limits: {
    minStake: 1,
    maxStake: 1000,
    withdrawalMin: 50,
    withdrawalMax: 5000,
  },
};

export const mockAdminAuditLog: AdminAuditState = {
  entries: [
    {
      id: "mock-audit-1",
      createdAt: new Date("2024-01-05T10:20:00Z").toISOString(),
      staffRole: "owner",
      staffName: "Алексей Морозов",
      action: "balance_adjustment",
      summary: "Демо +100.00, реальные +0.00 USDT. Причина: компенсация",
      targetType: "account",
      targetId: "default",
      uid: mockAccount.uid,
      amount: 100,
      previousDemoBalance: 400,
      previousRealBalance: 748.5,
      newDemoBalance: 500,
      newRealBalance: 748.5,
    },
    {
      id: "mock-audit-2",
      createdAt: new Date("2024-01-04T09:15:00Z").toISOString(),
      staffRole: "senior_admin",
      staffName: "Дмитрий Соколов",
      action: "withdrawal_paid",
      summary: "Заявка mock-withdrawal-2 · вывод СБП · 200.00 USDT выплачена",
      targetType: "withdrawal",
      targetId: "mock-withdrawal-2",
      uid: mockAccount.uid,
      amount: 200,
    },
  ],
};
