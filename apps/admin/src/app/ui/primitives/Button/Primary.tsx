"use client";
import type { ReactNode } from "react";
import clsx from "clsx";

type Props = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  fullWidth?: boolean;
};

export default function Primary({
  children,
  onClick,
  disabled,
  type = "button",
  className,
  fullWidth,
}: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "px-8 py-3 rounded-2xl bg-neutral-950 text-neutral-0 text-body-4-emphasis",
        "transition-all duration-300 ease-in-out hover:scale-105",
        "disabled:pointer-events-none disabled:opacity-60",
        fullWidth && "w-full",
        className
      )}
    >
      {children}
    </button>
  );
}
