"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLeadsStore } from "@/app/stores/leadsStore";
import PageHeader from "@/app/ui/primitives/PageHeader";
import DetailCard from "@/app/ui/cards/DetailCard";
import { Secondary } from "@/app/ui/primitives/Button";
import Loader from "@/app/ui/overlays/Loader/Loader";
import LeadStatusBadge from "../components/LeadStatusBadge";
import UpdateStatusModal from "../components/UpdateStatusModal";
import AssignLeadModal from "../components/AssignLeadModal";
import type { LeadStatus } from "@/app/types/lead";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function LeadDetail({ id }: { id: string }) {
  const { selectedLead, loading, fetchLeadById, updateStatus, assignLead } =
    useLeadsStore();
  const router = useRouter();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    fetchLeadById(id);
  }, [id, fetchLeadById]);

  if (loading || !selectedLead) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader variant="inline" label="Loading lead..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => router.push("/leads")}
        className="text-body-4 text-text-tertiary hover:text-text-primary transition-colors self-start"
      >
        &larr; Back to Leads
      </button>

      <PageHeader
        title={selectedLead.name}
        action={<LeadStatusBadge status={selectedLead.status} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DetailCard
          title="Contact Information"
          rows={[
            { label: "Email", value: selectedLead.email },
            { label: "Phone", value: selectedLead.phone },
            { label: "Company", value: selectedLead.company },
            {
              label: "Source",
              value: selectedLead.source
                .replace("_", " ")
                .replace(/\b\w/g, (c) => c.toUpperCase()),
            },
          ]}
        />
        <DetailCard
          title="Lead Details"
          rows={[
            {
              label: "Status",
              value: <LeadStatusBadge status={selectedLead.status} />,
            },
            {
              label: "Assignee",
              value: selectedLead.assigneeName ?? "Unassigned",
            },
            { label: "Created", value: formatDate(selectedLead.createdAt) },
            { label: "Updated", value: formatDate(selectedLead.updatedAt) },
            { label: "Notes", value: selectedLead.notes || "No notes" },
          ]}
        />
      </div>

      <div className="flex items-center gap-3">
        <Secondary onClick={() => setShowStatusModal(true)}>
          Change Status
        </Secondary>
        <Secondary onClick={() => setShowAssignModal(true)}>Assign</Secondary>
      </div>

      <UpdateStatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        currentStatus={selectedLead.status}
        onUpdate={(status: LeadStatus) => updateStatus(selectedLead.id, status)}
      />

      <AssignLeadModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onAssign={(assigneeId, assigneeName) =>
          assignLead(selectedLead.id, assigneeId, assigneeName)
        }
      />
    </div>
  );
}
