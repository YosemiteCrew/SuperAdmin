import type { ReactNode } from "react";

type Props = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="mb-4 text-text-tertiary">{icon}</div>}
      <h2 className="text-heading-3 text-text-primary mb-2">{title}</h2>
      {description && (
        <p className="text-body-4 text-text-tertiary max-w-md mb-6">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
