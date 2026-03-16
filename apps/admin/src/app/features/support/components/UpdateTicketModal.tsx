"use client";
import { useState } from "react";
import { CenterModal } from "@/app/ui/overlays/Modal";
import Dropdown from "@/app/ui/inputs/Dropdown";
import { Primary, Secondary } from "@/app/ui/primitives/Button";
import type { TicketStatus, TicketPriority } from "@/app/types/ticket";

const statusOptions = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting", label: "Waiting" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: TicketStatus;
  currentPriority: TicketPriority;
  onUpdate: (status: TicketStatus, priority: TicketPriority) => void;
};

export default function UpdateTicketModal({
  isOpen,
  onClose,
  currentStatus,
  currentPriority,
  onUpdate,
}: Props) {
  const [status, setStatus] = useState<TicketStatus>(currentStatus);
  const [priority, setPriority] = useState<TicketPriority>(currentPriority);

  const hasChanges = status !== currentStatus || priority !== currentPriority;

  const handleUpdate = () => {
    onUpdate(status, priority);
    onClose();
  };

  return (
    <CenterModal isOpen={isOpen} onClose={onClose} title="Update Ticket">
      <div className="flex flex-col gap-4">
        <Dropdown
          label="Status"
          options={statusOptions}
          value={status}
          onChange={(val) => setStatus(val as TicketStatus)}
        />
        <Dropdown
          label="Priority"
          options={priorityOptions}
          value={priority}
          onChange={(val) => setPriority(val as TicketPriority)}
        />
        <div className="flex items-center justify-end gap-3 pt-2">
          <Secondary onClick={onClose}>Cancel</Secondary>
          <Primary onClick={handleUpdate} disabled={!hasChanges}>
            Update
          </Primary>
        </div>
      </div>
    </CenterModal>
  );
}
