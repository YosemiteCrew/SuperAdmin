"use client";
import { ConfirmModal } from "@/app/ui/overlays/Modal";

type Action = "approve" | "suspend" | "deactivate";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  action: Action;
  businessName: string;
  onConfirm: () => void;
};

const actionConfig: Record<
  Action,
  { title: string; confirmLabel: string; confirmTone: "brand" | "danger"; getMessage: (name: string) => string }
> = {
  approve: {
    title: "Approve Business",
    confirmLabel: "Approve",
    confirmTone: "brand",
    getMessage: (name) => `Are you sure you want to approve "${name}"? This will activate the business account.`,
  },
  suspend: {
    title: "Suspend Business",
    confirmLabel: "Suspend",
    confirmTone: "danger",
    getMessage: (name) => `Are you sure you want to suspend "${name}"? The business will lose access until reactivated.`,
  },
  deactivate: {
    title: "Deactivate Business",
    confirmLabel: "Deactivate",
    confirmTone: "danger",
    getMessage: (name) => `Are you sure you want to deactivate "${name}"? This action will disable the business account.`,
  },
};

export default function BusinessActionModal({
  isOpen,
  onClose,
  action,
  businessName,
  onConfirm,
}: Props) {
  const config = actionConfig[action];

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={() => {
        onConfirm();
        onClose();
      }}
      title={config.title}
      message={config.getMessage(businessName)}
      confirmLabel={config.confirmLabel}
      confirmTone={config.confirmTone}
    />
  );
}
