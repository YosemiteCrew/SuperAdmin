"use client";
import { useState, useEffect, useCallback } from "react";
import { CenterModal } from "@/app/ui/overlays/Modal";
import Dropdown from "@/app/ui/inputs/Dropdown";
import { Primary } from "@/app/ui/primitives/Button";
import { Secondary } from "@/app/ui/primitives/Button";
import { getTeamMembers } from "@/app/services/mock";
import type { TeamMember } from "@/app/types/team";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (assigneeId: string, assigneeName: string) => void;
};

export default function AssignLeadModal({ isOpen, onClose, onAssign }: Props) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    if (isOpen) {
      getTeamMembers().then(setTeamMembers);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setSelectedId("");
    onClose();
  }, [onClose]);

  const handleAssign = () => {
    const member = teamMembers.find((m) => m.id === selectedId);
    if (member) {
      onAssign(member.id, member.name);
      handleClose();
    }
  };

  return (
    <CenterModal isOpen={isOpen} onClose={handleClose} title="Assign Lead">
      <div className="flex flex-col gap-4">
        <Dropdown
          label="Team Member"
          placeholder="Select a team member"
          options={teamMembers.map((m) => ({ value: m.id, label: m.name }))}
          value={selectedId}
          onChange={(val) => setSelectedId(val)}
        />
        <div className="flex items-center justify-end gap-3 pt-2">
          <Secondary onClick={handleClose}>Cancel</Secondary>
          <Primary onClick={handleAssign} disabled={!selectedId}>
            Assign
          </Primary>
        </div>
      </div>
    </CenterModal>
  );
}
