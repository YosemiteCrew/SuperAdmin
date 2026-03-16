"use client";
import { useState } from "react";
import { CenterModal } from "@/app/ui/overlays/Modal";
import Select from "@/app/ui/inputs/Select";
import { Primary, Secondary } from "@/app/ui/primitives/Button";
import type { GrantScope } from "@/app/types/break-glass";

const scopeOptions = [
  { value: "tenant_data", label: "Tenant Data" },
  { value: "financial_data", label: "Financial Data" },
  { value: "user_pii", label: "User PII" },
  { value: "full_access", label: "Full Access" },
];

const durationOptions = [
  { value: "1", label: "1 Hour" },
  { value: "4", label: "4 Hours" },
  { value: "8", label: "8 Hours" },
  { value: "24", label: "24 Hours" },
];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (params: {
    grantedTo: string;
    reason: string;
    ticketId: string;
    scope: GrantScope;
    expiresInHours: number;
  }) => void;
};

export default function CreateGrantModal({ isOpen, onClose, onCreate }: Props) {
  const [grantedTo, setGrantedTo] = useState("");
  const [reason, setReason] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [scope, setScope] = useState("tenant_data");
  const [duration, setDuration] = useState("1");

  const isValid =
    grantedTo.trim() !== "" &&
    reason.trim().length >= 10 &&
    ticketId.trim() !== "";

  const handleCreate = () => {
    if (!isValid) return;
    onCreate({
      grantedTo: grantedTo.trim(),
      reason: reason.trim(),
      ticketId: ticketId.trim(),
      scope: scope as GrantScope,
      expiresInHours: Number(duration),
    });
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setGrantedTo("");
    setReason("");
    setTicketId("");
    setScope("tenant_data");
    setDuration("1");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <CenterModal isOpen={isOpen} onClose={handleClose} title="Create Break Glass Grant" size="lg">
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl bg-warning-100 p-4">
          <p className="text-body-4 text-warning-600">
            Break glass access is audited. All actions will be logged.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-caption-1 text-text-secondary font-medium">
            Granted To
          </label>
          <input
            type="text"
            value={grantedTo}
            onChange={(e) => setGrantedTo(e.target.value)}
            placeholder="Name or user ID"
            className="w-full min-h-[48px] px-4 py-3 rounded-2xl border border-card-border text-body-4 text-text-primary font-satoshi outline-none transition-colors duration-200 focus:border-brand-950"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-caption-1 text-text-secondary font-medium">
            Reason
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Provide a detailed reason (min 10 characters)"
            rows={3}
            className="w-full px-4 py-3 rounded-2xl border border-card-border text-body-4 text-text-primary font-satoshi outline-none transition-colors duration-200 focus:border-brand-950 resize-none"
          />
          {reason.length > 0 && reason.length < 10 && (
            <span className="text-caption-2 text-danger-600">
              Reason must be at least 10 characters
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-caption-1 text-text-secondary font-medium">
            Ticket ID
          </label>
          <input
            type="text"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            placeholder="e.g. TICKET-1234"
            className="w-full min-h-[48px] px-4 py-3 rounded-2xl border border-card-border text-body-4 text-text-primary font-satoshi outline-none transition-colors duration-200 focus:border-brand-950"
          />
        </div>

        <Select
          label="Scope"
          options={scopeOptions}
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        />

        <Select
          label="Duration"
          options={durationOptions}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />

        <div className="flex items-center justify-end gap-3 pt-2">
          <Secondary onClick={handleClose}>Cancel</Secondary>
          <Primary onClick={handleCreate} disabled={!isValid}>
            Create Grant
          </Primary>
        </div>
      </div>
    </CenterModal>
  );
}
