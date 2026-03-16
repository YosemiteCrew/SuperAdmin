import Badge from "@/app/ui/primitives/Badge";
import type { TicketStatus } from "@/app/types/ticket";

const statusTones: Record<
  TicketStatus,
  { tone: "neutral" | "brand" | "success" | "warning" | "danger"; label: string }
> = {
  open: { tone: "brand", label: "Open" },
  in_progress: { tone: "warning", label: "In Progress" },
  waiting: { tone: "neutral", label: "Waiting" },
  escalated: { tone: "danger", label: "Escalated" },
  resolved: { tone: "success", label: "Resolved" },
  closed: { tone: "neutral", label: "Closed" },
};

export default function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const { tone, label } = statusTones[status];
  return <Badge tone={tone}>{label}</Badge>;
}
