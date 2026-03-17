"use client";
import { useState } from "react";
import CenterModal from "@/app/ui/overlays/Modal/CenterModal";
import { Primary, Secondary } from "@/app/ui/primitives/Button";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  businessName: string;
  onReject: (reason: string) => void;
};

export default function RejectVerificationModal({
  isOpen,
  onClose,
  businessName,
  onReject,
}: Props) {
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    if (!reason.trim()) return;
    onReject(reason.trim());
    setReason("");
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <CenterModal isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="flex flex-col gap-5">
        <h2 className="text-heading-1 text-text-primary">
          Reject Profile Verification
        </h2>

        <div className="flex flex-col gap-1">
          <p className="text-caption-1 font-bold text-text-primary">
            You&apos;re rejecting the profile verification request for{" "}
            {businessName}
          </p>
          <p className="text-caption-1 font-bold text-text-tertiary">
            Please let the user know why their profile couldn&apos;t be
            approved. Your message will be shared with them for clarification
            and resubmission.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-caption-1 font-bold text-text-primary">
            Your Message to {businessName}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Briefly explain the reason for rejection..."
            rows={4}
            className="w-full px-4 py-3 border border-neutral-400 rounded-lg text-body-4 text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:border-neutral-950 transition-colors"
          />
          <button
            type="button"
            className="flex items-center gap-1 text-caption-1 font-medium text-text-primary self-start"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" />
            </svg>
            Attach files
          </button>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Secondary onClick={handleClose}>Cancel</Secondary>
          <Primary onClick={handleSubmit} disabled={!reason.trim()}>
            <span className="flex items-center gap-2">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
              </svg>
              Send Message
            </span>
          </Primary>
        </div>
      </div>
    </CenterModal>
  );
}
