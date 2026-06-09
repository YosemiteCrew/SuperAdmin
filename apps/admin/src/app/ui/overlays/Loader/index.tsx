export function Loader({ label = 'Loading...' }: { label?: string }) {
  return (
    <div role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      {/* TODO: spinner SVG */}
    </div>
  );
}
