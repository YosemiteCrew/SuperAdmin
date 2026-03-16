"use client";
import { ConfirmModal } from "@/app/ui/overlays/Modal";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  onConfirm: () => void;
};

export default function RemoveMemberModal({
  isOpen,
  onClose,
  memberName,
  onConfirm,
}: Props) {
  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={() => {
        onConfirm();
        onClose();
      }}
      title="Remove Team Member"
      message={`Remove ${memberName} from the team? This action cannot be undone.`}
      confirmLabel="Remove"
      confirmTone="danger"
    />
  );
}
