import Badge from "@/app/ui/primitives/Badge";
import type { BusinessStatus } from "@/app/types/business";

const statusTones: Record<
  BusinessStatus,
  { tone: "neutral" | "brand" | "success" | "warning" | "danger"; label: string }
> = {
  pending: { tone: "warning", label: "Pending" },
  active: { tone: "success", label: "Active" },
  suspended: { tone: "danger", label: "Suspended" },
  deactivated: { tone: "neutral", label: "Deactivated" },
  invited: { tone: "brand", label: "Invited" },
};

export default function BusinessStatusBadge({ status }: { status: BusinessStatus }) {
  const { tone, label } = statusTones[status];
  return <Badge tone={tone}>{label}</Badge>;
}
