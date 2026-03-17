"use client";
import Image from "next/image";
import "./YosemiteLoader.css";

type LoaderVariant = "inline" | "fullscreen" | "fullscreen-translucent";

type Props = {
  variant?: LoaderVariant;
  label?: string;
  size?: number;
};

const variantClasses: Record<LoaderVariant, string> = {
  inline: "yosemite-loader--inline",
  fullscreen: "yosemite-loader--fullscreen",
  "fullscreen-translucent": "yosemite-loader--fullscreen-translucent",
};

export default function YosemiteLoader({
  variant = "inline",
  label,
  size = 80,
}: Props) {
  return (
    <output
      className={`yosemite-loader ${variantClasses[variant]}`}
      aria-live="polite"
    >
      <Image
        src="/assets/yosemiteLoader.gif"
        alt="Loading"
        width={size}
        height={size}
        unoptimized
        className="yosemite-loader__image"
      />
      {label && <span className="yosemite-loader__label">{label}</span>}
    </output>
  );
}
