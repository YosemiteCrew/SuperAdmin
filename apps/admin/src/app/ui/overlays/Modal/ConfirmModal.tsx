"use client";
import clsx from "clsx";
import CenterModal from "./CenterModal";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmTone?: "danger" | "brand";
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  confirmTone = "brand",
}: Props) {
  return (
    <CenterModal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-body-4 text-text-secondary mb-6">{message}</p>
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 rounded-2xl border border-card-border text-body-4-emphasis text-text-primary hover:border-neutral-500 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={clsx(
            "px-6 py-2.5 rounded-2xl text-body-4-emphasis text-neutral-0 transition-all duration-300 hover:scale-105",
            confirmTone === "danger" ? "bg-danger-600" : "bg-brand-950"
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </CenterModal>
  );
}
