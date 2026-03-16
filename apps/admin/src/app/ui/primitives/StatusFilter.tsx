"use client";

type Option = {
  value: string;
  label: string;
  count?: number;
  activeColor?: string;    // background color when active
  activeTextColor?: string; // text color when active (defaults to white)
};

type Props = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export default function StatusFilter({
  options,
  value,
  onChange,
  className = "",
}: Props) {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {options.map((opt) => {
        const isActive = opt.value === value;
        const activeBg = opt.activeColor ?? "#247AED";
        const activeText = opt.activeTextColor ?? "#FFFFFF";

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              minWidth: "80px",
              padding: "6px 16px",
              borderRadius: "24px",
              fontSize: "16px",
              lineHeight: "24px",
              letterSpacing: "-0.02em",
              fontFamily: "var(--font-satoshi)",
              fontWeight: 400,
              cursor: "pointer",
              transition: "all 0.2s",
              border: isActive ? `1px solid ${activeBg}` : "1px solid #EAEAEA",
              background: isActive ? activeBg : "transparent",
              color: isActive ? activeText : "#A09F9F",
            }}
          >
            {opt.label}
            {opt.count !== undefined && ` (${opt.count})`}
          </button>
        );
      })}
    </div>
  );
}
