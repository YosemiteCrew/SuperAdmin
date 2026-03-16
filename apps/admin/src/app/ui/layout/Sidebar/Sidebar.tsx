"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useRef, useCallback, useEffect } from "react";
import { RiMenuLine, RiCloseLine } from "react-icons/ri";
import { appRoutes } from "@/constants/routes";
import "./Sidebar.css";

const MIN_WIDTH = 180;
const MAX_WIDTH = 360;
const DEFAULT_WIDTH = 220;
const STORAGE_KEY = "sa_sidebar_width";

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [width, setWidth] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) return parsed;
      }
    }
    return DEFAULT_WIDTH;
  });
  const [dragging, setDragging] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // Set CSS variable on document for header/layout to consume
  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-width", `${width}px`);
  }, [width]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);

    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      // Save to localStorage
      const el = document.documentElement;
      const currentWidth = el.style.getPropertyValue("--sidebar-width");
      localStorage.setItem(STORAGE_KEY, currentWidth.replace("px", ""));
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [width]);

  const navContent = (
    <>
      <div className="sidebar-logo">
        <Image
          src="/assets/yosemite-logo.png"
          alt="Yosemite Crew"
          width={44}
          height={40}
          priority
        />
        <span className="text-body-3-emphasis text-text-primary">
          Admin Portal
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
              <span className="route-icon">
                <Icon size={20} />
              </span>
              <span className="route-label">{route.name}</span>
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
      <aside
        ref={sidebarRef}
        className="sidebar sidebar-desktop"
        style={{ width: `${width}px` }}
      >
        {navContent}
        {/* Resize handle with drag grip indicator */}
        <div
          className={`sidebar-resize-handle ${dragging ? "sidebar-resize-active" : ""}`}
          onMouseDown={handleMouseDown}
        >
          <div className="resize-indicator">
            <span /><span />
            <span /><span />
            <span /><span />
          </div>
        </div>
      </aside>

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
