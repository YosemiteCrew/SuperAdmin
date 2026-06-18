import { ButtonHTMLAttributes, MouseEvent } from 'react';

import { cn } from '@/app/lib/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'yc-primary-button border-[1.5px] border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800',
  secondary:
    'border-[1.5px] border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900',
  danger:
    'border-[1.5px] border-danger-600 bg-danger-600 text-white hover:bg-[#d53225] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger-600',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'min-h-10 px-4 text-sm',
  md: 'min-h-[3.125rem] px-5 text-base',
  lg: 'min-h-14 px-6 text-lg',
};

function updatePrimaryGlow(event: MouseEvent<HTMLButtonElement>) {
  const { currentTarget, clientX, clientY } = event;
  const rect = currentTarget.getBoundingClientRect();
  currentTarget.style.setProperty('--yc-button-x', `${clientX - rect.left}px`);
  currentTarget.style.setProperty('--yc-button-y', `${clientY - rect.top}px`);
}

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  children,
  className,
  onMouseEnter,
  onMouseMove,
  ...props
}: Readonly<ButtonProps>) {
  const isPrimary = variant === 'primary';

  return (
    <button
      type={type}
      className={cn(
        'inline-flex w-fit items-center justify-center rounded-full font-medium tracking-[-0.02em] transition-[background-color,border-color,box-shadow,opacity] duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-70',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      onMouseEnter={(event) => {
        if (isPrimary) {
          updatePrimaryGlow(event);
        }
        onMouseEnter?.(event);
      }}
      onMouseMove={(event) => {
        if (isPrimary) {
          updatePrimaryGlow(event);
        }
        onMouseMove?.(event);
      }}
      {...props}
    >
      <span>{children}</span>
    </button>
  );
}
