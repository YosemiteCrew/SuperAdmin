"use client";
import { useRouter } from "next/navigation";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type Props = {
  items: BreadcrumbItem[];
  className?: string;
};

function ChevronSeparator() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path d="M6 4L10 8L6 12" stroke="#A09F9F" strokeWidth="1.5" />
    </svg>
  );
}

export default function Breadcrumb({ items, className }: Props) {
  const router = useRouter();

  return (
    <nav className={`flex items-center gap-3 ${className ?? ""}`}>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;

        return (
          <span key={idx} className="flex items-center gap-3">
            {idx > 0 && <ChevronSeparator />}
            {item.href && !isLast ? (
              <button
                type="button"
                onClick={() => router.push(item.href!)}
                className="text-[16px] leading-[18px] tracking-[-0.02em] font-medium hover:text-neutral-950 transition-colors"
                style={{ color: "#A09F9F", fontFamily: "var(--font-satoshi)" }}
              >
                {item.label}
              </button>
            ) : (
              <span
                className={`text-[16px] leading-[18px] tracking-[-0.02em] ${
                  isLast ? "font-bold" : "font-medium"
                }`}
                style={{
                  color: isLast ? "#302F2E" : "#A09F9F",
                  fontFamily: "var(--font-satoshi)",
                }}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
