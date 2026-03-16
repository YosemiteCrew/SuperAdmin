"use client";
import { useState } from "react";
import { CenterModal } from "@/app/ui/overlays/Modal";
import Dropdown from "@/app/ui/inputs/Dropdown";
import { Primary, Secondary } from "@/app/ui/primitives/Button";
import type { LeadStatus } from "@/app/types/lead";

const statusOptions = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: LeadStatus;
  onUpdate: (status: LeadStatus) => void;
};

export default function UpdateStatusModal({
  isOpen,
  onClose,
  currentStatus,
  onUpdate,
}: Props) {
  const [status, setStatus] = useState<LeadStatus>(currentStatus);

  const handleUpdate = () => {
    onUpdate(status);
    onClose();
  };

  return (
    <CenterModal isOpen={isOpen} onClose={onClose} title="Update Status">
      <div className="flex flex-col gap-4">
        <Dropdown
          label="Status"
          options={statusOptions}
          value={status}
          onChange={(val) => setStatus(val as LeadStatus)}
        />
        <div className="flex items-center justify-end gap-3 pt-2">
          <Secondary onClick={onClose}>Cancel</Secondary>
          <Primary onClick={handleUpdate} disabled={status === currentStatus}>
            Update
          </Primary>
        </div>
      </div>
    </CenterModal>
  );
}
