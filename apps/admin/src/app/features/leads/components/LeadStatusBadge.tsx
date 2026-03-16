import Badge from "@/app/ui/primitives/Badge";
import type { LeadStatus } from "@/app/types/lead";

const statusTones: Record<
  LeadStatus,
  { tone: "neutral" | "brand" | "success" | "warning" | "danger"; label: string }
> = {
  new: { tone: "brand", label: "New" },
  contacted: { tone: "warning", label: "Contacted" },
  qualified: { tone: "success", label: "Qualified" },
  converted: { tone: "success", label: "Converted" },
  lost: { tone: "danger", label: "Lost" },
};

export default function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const { tone, label } = statusTones[status];
  return <Badge tone={tone}>{label}</Badge>;
}
