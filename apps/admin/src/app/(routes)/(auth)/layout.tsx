export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="yc-auth-shell">
      <div className="yc-auth-stage">
        <div className="yc-auth-brand">
          <div className="yc-auth-brand-chip">Yosemite Crew</div>
          <p className="yc-auth-brand-copy">Internal management dashboard</p>
        </div>
        {children}
      </div>
    </div>
  );
}
