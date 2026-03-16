type Props = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export default function PageHeader({ title, subtitle, action }: Props) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-heading-1 text-text-primary">{title}</h1>
        {subtitle && (
          <p className="text-body-4 text-text-tertiary mt-1">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
