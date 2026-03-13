import Link from "next/link";

type ButtonVariant = "primary" | "secondary";

type ButtonProps = {
  children: React.ReactNode;
  variant?: ButtonVariant;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  className?: string;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-gray-900 text-white hover:bg-gray-800 border-transparent",
  secondary:
    "bg-white text-gray-900 border border-gray-900 hover:bg-gray-50",
};

export function Button({
  children,
  variant = "primary",
  href,
  onClick,
  type = "button",
  icon,
  iconPosition = "right",
  className = "",
}: ButtonProps) {
  const baseStyles =
    "inline-flex w-full items-center justify-center gap-2 rounded-[25px] px-6 py-3.5 text-base font-medium transition-colors";
  const styles = `${baseStyles} ${variantStyles[variant]} ${className}`;

  const content = (
    <>
      {icon && iconPosition === "left" && icon}
      {children}
      {icon && iconPosition === "right" && icon}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={styles}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={styles}>
      {content}
    </button>
  );
}
