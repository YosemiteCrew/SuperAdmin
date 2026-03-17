"use client";
import type { ReactNode } from "react";
import clsx from "clsx";
import ModalBase from "./ModalBase";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
};

const sizeClasses: Record<string, string> = {
  sm: "w-[90%] sm:w-[400px]",
  md: "w-[90%] sm:w-[500px]",
  lg: "w-[90%] sm:w-[640px]",
};

export default function CenterModal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: Props) {
  return (
    <ModalBase isOpen={isOpen} onClose={onClose}>
      <div
        className={clsx(
          "z-[1200] bg-neutral-0 rounded-2xl border border-card-border p-6",
          "animate-[fadeIn_0.2s_ease-out]",
          sizeClasses[size]
        )}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-heading-2 text-text-primary">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="text-text-tertiary hover:text-text-primary transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </ModalBase>
  );
}
