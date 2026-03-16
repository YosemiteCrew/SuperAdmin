"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { RiMenuLine, RiCloseLine } from "react-icons/ri";
import { appRoutes } from "@/constants/routes";
import "./Sidebar.css";

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <>
      <div className="sidebar-logo">
        <Image
          src="/assets/yosemite-logo.png"
          alt="Yosemite Crew"
          width={36}
          height={33}
          priority
        />
        <span className="text-body-4-emphasis text-text-primary">
          Super Admin
        </span>
      </div>
      <nav className="sidebar-nav">
        {appRoutes.map((route) => {
          const isActive = pathname.startsWith(route.href);
          const Icon = route.icon;
          return (
            <Link
              key={route.href}
              href={route.href}
              className={`route ${isActive ? "route-active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={18} />
              <span>{route.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <RiMenuLine size={24} />
      </button>

      {/* Desktop sidebar */}
      <aside className="sidebar sidebar-desktop">{navContent}</aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)}>
          <aside
            className="sidebar sidebar-mobile"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="mobile-close-btn"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <RiCloseLine size={24} />
            </button>
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
