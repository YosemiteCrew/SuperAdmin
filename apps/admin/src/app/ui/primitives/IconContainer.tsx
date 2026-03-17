"use client";
import type { ReactNode } from "react";
import clsx from "clsx";

/**
 * Design system icon sizes and containers:
 *
 * | Size | Icon | Container | Border Radius | Use Case                                  |
 * |------|------|-----------|---------------|-------------------------------------------|
 * | sm   | 16px | 32px      | 12px          | Inside inputs, subtle UI                  |
 * | md   | 18px | 32px      | 12px          | Most app icons (recommended default)      |
 * | lg   | 20px | 40px      | 14px          | Toolbar icons, primary actions             |
 * | xl   | 24px | 48px      | 16px          | Feature icons (website), large empty states|
 * | 2xl  | 32px | 56px      | 16px          | Feature icons (website), large empty states|
 */

type IconSize = "sm" | "md" | "lg" | "xl" | "2xl";

type Props = {
  size?: IconSize;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  as?: "button" | "div";
};

const sizeConfig: Record<IconSize, { container: number; icon: number; radius: number }> = {
  sm:  { container: 32, icon: 16, radius: 12 },
  md:  { container: 32, icon: 18, radius: 12 },
  lg:  { container: 40, icon: 20, radius: 14 },
  xl:  { container: 48, icon: 24, radius: 16 },
  "2xl": { container: 56, icon: 32, radius: 16 },
};

export default function IconContainer({
  size = "md",
  children,
  className,
  onClick,
  as,
}: Props) {
  const config = sizeConfig[size];
  const Tag = as ?? (onClick ? "button" : "div");

  return (
    <Tag
      type={Tag === "button" ? "button" : undefined}
      onClick={onClick}
      className={clsx(
        "inline-flex items-center justify-center shrink-0",
        onClick && "cursor-pointer transition-colors hover:bg-neutral-100",
        className
      )}
      style={{
        width: config.container,
        height: config.container,
        borderRadius: config.radius,
        border: "1px solid #BFBFBE",
        boxSizing: "border-box",
      }}
    >
      {children}
    </Tag>
  );
}

export { sizeConfig as iconSizeConfig };
export type { IconSize };
