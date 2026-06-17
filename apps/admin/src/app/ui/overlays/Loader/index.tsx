export function Loader({ label = 'Loading...' }: { label?: string }) {
  return (
    <output aria-label={label}>
      <span className="sr-only">{label}</span>
      {/* TODO: spinner SVG */}
    </output>
  );
}
