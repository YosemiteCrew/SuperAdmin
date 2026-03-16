export type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting"
  | "escalated"
  | "resolved"
  | "closed";
export type TicketPriority = "low" | "medium" | "high" | "critical";
export type TicketCategory =
  | "general"
  | "technical"
  | "billing"
  | "feature_request"
  | "complaint";

export type SupportTicket = {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  assigneeId: string | null;
  assigneeName: string | null;
  createdBy: string;
  createdByEmail: string;
  createdAt: string;
  updatedAt: string;
};
