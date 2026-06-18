export function Loader({ label = 'Loading...' }: Readonly<{ label?: string }>) {
  return (
    <output aria-label={label}>
      <span className="sr-only">{label}</span>
    </output>
  );
}
