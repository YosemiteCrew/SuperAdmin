"use client";
import ConfirmModal from "@/app/ui/overlays/Modal/ConfirmModal";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  grantedToName: string;
};

export default function RevokeGrantModal({
  isOpen,
  onClose,
  onConfirm,
  grantedToName,
}: Props) {
  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Revoke Access Grant"
      message={`Are you sure you want to revoke the break glass access for ${grantedToName}? This action will be logged.`}
      confirmLabel="Revoke Access"
      confirmTone="danger"
    />
  );
}
