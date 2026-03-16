"use client";
import clsx from "clsx";
import styles from "./Loader.module.css";

type Props = {
  variant?: "inline" | "fullscreen";
  label?: string;
  className?: string;
};

export default function Loader({
  variant = "inline",
  label,
  className,
}: Props) {
  const spinner = (
    <div className={clsx("flex items-center gap-3", className)}>
      <div
        className={clsx(
          styles["loader-spinner"],
          "rounded-full border-2 border-neutral-200 border-t-brand-950",
          variant === "fullscreen" ? "w-10 h-10" : "w-5 h-5"
        )}
      />
      {label && (
        <span
          className={clsx(
            "text-text-secondary",
            variant === "fullscreen" ? "text-body-4" : "text-caption-1"
          )}
        >
          {label}
        </span>
      )}
    </div>
  );

  if (variant === "fullscreen") {
    return (
      <div className="fixed inset-0 z-[9999] bg-neutral-0/80 backdrop-blur-sm flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}
