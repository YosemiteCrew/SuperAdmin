import Badge from "@/app/ui/primitives/Badge";
import type { TicketPriority } from "@/app/types/ticket";

const priorityTones: Record<
  TicketPriority,
  { tone: "neutral" | "brand" | "success" | "warning" | "danger"; label: string }
> = {
  low: { tone: "neutral", label: "Low" },
  medium: { tone: "warning", label: "Medium" },
  high: { tone: "danger", label: "High" },
  critical: { tone: "danger", label: "Critical" },
};

export default function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const { tone, label } = priorityTones[priority];
  return <Badge tone={tone}>{label}</Badge>;
}
