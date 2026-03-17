"use client";
import { useEffect, useState } from "react";
import { useSupportStore } from "@/app/stores/supportStore";
import PageHeader from "@/app/ui/primitives/PageHeader";
import DetailCard from "@/app/ui/cards/DetailCard";
import { Secondary } from "@/app/ui/primitives/Button";
import { SkeletonDetailPage } from "@/app/ui/primitives/Skeleton";
import Breadcrumb from "@/app/ui/primitives/Breadcrumb";
import TicketStatusBadge from "../components/TicketStatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import UpdateTicketModal from "../components/UpdateTicketModal";
import AssignTicketModal from "../components/AssignTicketModal";
import type { TicketStatus, TicketPriority } from "@/app/types/ticket";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TicketDetail({ id }: { id: string }) {
  const { selectedTicket, loading, fetchTicketById, updateStatus, updatePriority, assignTicket } =
    useSupportStore();
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchTicketById(id);
  }, [id, fetchTicketById]);

  if (loading || !selectedTicket) {
    return <SkeletonDetailPage cards={2} />;
  }

  const handleUpdate = async (status: TicketStatus, priority: TicketPriority) => {
    if (status !== selectedTicket.status) {
      await updateStatus(selectedTicket.id, status);
    }
    if (priority !== selectedTicket.priority) {
      await updatePriority(selectedTicket.id, priority);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "Support", href: "/support" },
          { label: selectedTicket.subject },
        ]}
      />

      <PageHeader
        title={selectedTicket.subject}
        action={
          <div className="flex items-center gap-2">
            <TicketStatusBadge status={selectedTicket.status} />
            <PriorityBadge priority={selectedTicket.priority} />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DetailCard
          title="Ticket Information"
          rows={[
            { label: "Subject", value: selectedTicket.subject },
            { label: "Description", value: selectedTicket.description },
            {
              label: "Category",
              value: selectedTicket.category
                .replace("_", " ")
                .replace(/\b\w/g, (c) => c.toUpperCase()),
            },
            { label: "Created By", value: selectedTicket.createdBy },
            { label: "Email", value: selectedTicket.createdByEmail },
          ]}
        />
        <DetailCard
          title="Status & Assignment"
          rows={[
            {
              label: "Status",
              value: <TicketStatusBadge status={selectedTicket.status} />,
            },
            {
              label: "Priority",
              value: <PriorityBadge priority={selectedTicket.priority} />,
            },
            {
              label: "Assignee",
              value: selectedTicket.assigneeName ?? "Unassigned",
            },
            { label: "Created", value: formatDate(selectedTicket.createdAt) },
            { label: "Updated", value: formatDate(selectedTicket.updatedAt) },
          ]}
        />
      </div>

      <div className="flex items-center gap-3">
        <Secondary onClick={() => setShowUpdateModal(true)}>
          Update Status / Priority
        </Secondary>
        <Secondary onClick={() => setShowAssignModal(true)}>Assign</Secondary>
      </div>

      <UpdateTicketModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        currentStatus={selectedTicket.status}
        currentPriority={selectedTicket.priority}
        onUpdate={handleUpdate}
      />

      <AssignTicketModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onAssign={(assigneeId, assigneeName) =>
          assignTicket(selectedTicket.id, assigneeId, assigneeName)
        }
      />
    </div>
  );
}
