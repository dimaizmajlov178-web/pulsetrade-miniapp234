export const supportTicketStatuses = ["new", "in_progress", "closed"] as const;

export type SupportTicketStatus = (typeof supportTicketStatuses)[number];

export const supportTicketStatusLabels: Record<SupportTicketStatus, string> = {
  new: "Новое",
  in_progress: "В работе",
  closed: "Закрыто",
};

export const supportMessageAuthors = ["user", "support"] as const;

export type SupportMessageAuthor = (typeof supportMessageAuthors)[number];

export type SupportMessage = {
  id: string;
  author: SupportMessageAuthor;
  authorName: string | null;
  body: string;
  createdAt: string;
};

export type SupportTicket = {
  id: string;
  status: SupportTicketStatus;
  subject: string | null;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  messages: SupportMessage[];
};

export type AdminSupportTicket = SupportTicket & {
  uid: number;
};

export type SupportState = {
  tickets: SupportTicket[];
};

export type AdminSupportState = {
  tickets: AdminSupportTicket[];
};

export const supportHistoryLimit = 50;

export const adminSupportTicketsLimit = 200;

export const supportMessageMaxLength = 2_000;

export function isSupportTicketOpen(ticket: SupportTicket): boolean {
  return ticket.status !== "closed";
}
