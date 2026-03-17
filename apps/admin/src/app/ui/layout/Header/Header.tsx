"use client";
import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/app/stores/authStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Avatar from "@/app/ui/primitives/Avatar";
import "./Header.css";

export default function Header() {
  const { user, signOut } = useAuthStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSignOut = () => {
    signOut();
    router.push("/login");
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <div />
        <div ref={dropdownRef} className="relative">
          {/* Trigger */}
          <button
            type="button"
            onClick={() => setOpen((p) => !p)}
            className="flex items-center gap-3 cursor-pointer outline-none"
          >
            <Avatar name={user?.name ?? "Admin"} size={40} />
            <span style={{ fontFamily: "var(--font-satoshi)", fontSize: "16px", fontWeight: 500, color: "#302F2E" }}>
              {user?.name}
            </span>
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 320 512"
              className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              style={{ color: "#302F2E" }} height="16" width="16">
              <path d="M137.4 374.6c12.5 12.5 32.8 12.5 45.3 0l128-128c9.2-9.2 11.9-22.9 6.9-34.9s-16.6-19.8-29.6-19.8L32 192c-12.9 0-24.6 7.8-29.6 19.8s-2.2 25.7 6.9 34.9l128 128z" />
            </svg>
          </button>

          {/* Dropdown */}
          {open && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0, minWidth: "200px",
              background: "#FFFFFF", border: "1px solid #EAEAEA", borderRadius: "16px",
              zIndex: 50, overflow: "hidden",
            }}>
              <Link href="/settings" onClick={() => setOpen(false)}
                style={{
                  display: "block", padding: "14px 20px",
                  fontFamily: "var(--font-satoshi)", fontSize: "16px", fontWeight: 400,
                  color: "#302F2E", textDecoration: "none", transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#F7F7F7"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                Settings
              </Link>
              <div style={{ borderTop: "1px solid #EAEAEA" }} />
              <button type="button" onClick={handleSignOut}
                style={{
                  display: "block", width: "100%", textAlign: "left", padding: "14px 20px",
                  fontFamily: "var(--font-satoshi)", fontSize: "16px", fontWeight: 400,
                  color: "#EA3729", background: "transparent", border: "none", cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#F7F7F7"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
