import type { AdminActor } from "@/lib/admin";
import {
  appendUserSupportMessageRecord,
  closeSupportTicketRecord,
  createSupportTicketRecord,
  DEFAULT_ACCOUNT_ID,
  getAllSupportTickets,
  getAccountSupportTickets,
  getOrCreateAccount,
  getSupportTicketById,
  replySupportTicketRecord,
  takeSupportTicketRecord,
  toAdminSupportTicket,
  toPublicSupportTicket,
  type SupportTicketRecord,
} from "@/lib/models";
import {
  adminSupportTicketsLimit,
  supportHistoryLimit,
  type AdminSupportTicket,
  type SupportMessage,
  type SupportState,
  type SupportTicket,
} from "@/lib/support";
import type {
  AdminSupportActionInput,
  SupportMessageInput,
} from "@/lib/validation/support";

export class SupportError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "SUPPORT_ERROR") {
    super(message);
    this.name = "SupportError";
    this.status = status;
    this.code = code;
  }
}

function buildUserMessage(input: SupportMessageInput): SupportMessage {
  return {
    id: crypto.randomUUID(),
    author: "user",
    authorName: null,
    body: input.message.trim(),
    createdAt: new Date().toISOString(),
  };
}

function buildSupportMessage(
  input: SupportMessageInput,
  actor: AdminActor
): SupportMessage {
  return {
    id: crypto.randomUUID(),
    author: "support",
    authorName: actor.name,
    body: input.message.trim(),
    createdAt: new Date().toISOString(),
  };
}

export async function getSupportState(
  accountId: string = DEFAULT_ACCOUNT_ID
): Promise<SupportState> {
  const tickets = await getAccountSupportTickets(
    accountId,
    supportHistoryLimit
  );

  return {
    tickets: tickets.map(toPublicSupportTicket),
  };
}

export async function sendSupportMessage(
  input: SupportMessageInput,
  accountId: string = DEFAULT_ACCOUNT_ID
): Promise<SupportState> {
  const account = await getOrCreateAccount(accountId);
  const tickets = await getAccountSupportTickets(
    accountId,
    supportHistoryLimit
  );
  const activeTicket = tickets.find((ticket) => ticket.status !== "closed");
  const message = buildUserMessage(input);

  if (activeTicket) {
    const updated = await appendUserSupportMessageRecord(
      activeTicket.id,
      message
    );

    if (!updated) {
      throw new SupportError(
        "Обращение уже закрыто. Отправьте сообщение ещё раз, чтобы создать новое.",
        409,
        "TICKET_CLOSED"
      );
    }

    return getSupportState(accountId);
  }

  const now = message.createdAt;
  const record: SupportTicketRecord = {
    id: crypto.randomUUID(),
    accountId,
    uid: account.uid,
    status: "new",
    subject: null,
    assignedTo: null,
    createdAt: now,
    updatedAt: now,
    closedAt: null,
    messages: [message],
  };

  await createSupportTicketRecord(record);

  return getSupportState(accountId);
}

export async function closeSupportTicketForUser(
  id: string,
  accountId: string = DEFAULT_ACCOUNT_ID
): Promise<SupportState> {
  const ticket = await getSupportTicketById(id);

  if (!ticket || ticket.accountId !== accountId) {
    throw new SupportError("Обращение не найдено", 404, "NOT_FOUND");
  }

  if (ticket.status === "closed") {
    return getSupportState(accountId);
  }

  const closed = await closeSupportTicketRecord(id);

  if (!closed) {
    throw new SupportError(
      "Не удалось закрыть обращение. Попробуйте ещё раз.",
      409,
      "CLOSE_CONFLICT"
    );
  }

  return getSupportState(accountId);
}

export async function getAdminSupportState(): Promise<{
  tickets: AdminSupportTicket[];
}> {
  const tickets = await getAllSupportTickets(adminSupportTicketsLimit);

  return {
    tickets: tickets.map(toAdminSupportTicket).sort((left, right) => {
      const priority =
        statusPriority(left.status) - statusPriority(right.status);

      if (priority !== 0) {
        return priority;
      }

      return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    }),
  };
}

function statusPriority(status: SupportTicket["status"]): number {
  if (status === "new") {
    return 0;
  }

  if (status === "in_progress") {
    return 1;
  }

  return 2;
}

async function requireTicket(id: string): Promise<SupportTicketRecord> {
  const ticket = await getSupportTicketById(id);

  if (!ticket) {
    throw new SupportError("Обращение не найдено", 404, "NOT_FOUND");
  }

  return ticket;
}

export async function applyAdminSupportAction(
  id: string,
  input: AdminSupportActionInput,
  actor: AdminActor
): Promise<AdminSupportTicket> {
  const ticket = await requireTicket(id);

  if (ticket.status === "closed") {
    throw new SupportError(
      "Закрытое обращение нельзя изменить",
      409,
      "TICKET_CLOSED"
    );
  }

  if (input.action === "take") {
    if (ticket.status === "in_progress") {
      return toAdminSupportTicket(ticket);
    }

    const updated = await takeSupportTicketRecord(id, actor.name);

    if (!updated) {
      const current = await requireTicket(id);

      return toAdminSupportTicket(current);
    }

    return toAdminSupportTicket(updated);
  }

  if (input.action === "reply") {
    const message = buildSupportMessage(input, actor);
    const updated = await replySupportTicketRecord(id, message, actor.name);

    if (!updated) {
      throw new SupportError(
        "Не удалось отправить ответ. Обращение уже закрыто.",
        409,
        "REPLY_CONFLICT"
      );
    }

    return toAdminSupportTicket(updated);
  }

  const closed = await closeSupportTicketRecord(id);

  if (!closed) {
    const current = await requireTicket(id);

    return toAdminSupportTicket(current);
  }

  return toAdminSupportTicket(closed);
}
