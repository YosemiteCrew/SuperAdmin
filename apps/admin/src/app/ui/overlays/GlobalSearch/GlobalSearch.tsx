"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { appRoutes } from "@/app/constants/routes";
import "./GlobalSearch.css";

type SearchItem = {
  label: string;
  href: string;
  section: string;
  keywords: string[];
};

const searchItems: SearchItem[] = [
  // Pages
  ...appRoutes.map((r) => ({
    label: r.name,
    href: r.href,
    section: "Pages",
    keywords: [r.name.toLowerCase()],
  })),
  // Quick actions
  {
    label: "Create Lead",
    href: "/leads",
    section: "Actions",
    keywords: ["create", "new", "lead", "add"],
  },
  {
    label: "View Pending Verifications",
    href: "/businesses",
    section: "Actions",
    keywords: ["pending", "verification", "verify", "approve"],
  },
  {
    label: "Manage Team Members",
    href: "/team",
    section: "Actions",
    keywords: ["team", "member", "invite", "add"],
  },
  {
    label: "View Support Tickets",
    href: "/support",
    section: "Actions",
    keywords: ["ticket", "support", "help", "issue"],
  },
  {
    label: "Check Audit Log",
    href: "/audit",
    section: "Actions",
    keywords: ["audit", "log", "history", "activity"],
  },
  {
    label: "View Analytics",
    href: "/analytics",
    section: "Actions",
    keywords: ["analytics", "stats", "metrics", "chart"],
  },
  {
    label: "Break Glass Access",
    href: "/break-glass",
    section: "Actions",
    keywords: ["break", "glass", "emergency", "access", "grant"],
  },
  {
    label: "Account Settings",
    href: "/settings",
    section: "Actions",
    keywords: ["settings", "account", "profile", "password"],
  },
];

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!query.trim()) return searchItems;
    const q = query.toLowerCase();
    return searchItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.includes(q))
    );
  }, [query]);

  // Group by section
  const grouped = useMemo(() => {
    const groups: Record<string, SearchItem[]> = {};
    for (const item of filtered) {
      if (!groups[item.section]) groups[item.section] = [];
      groups[item.section].push(item);
    }
    return groups;
  }, [filtered]);

  const flatItems = filtered;

  const navigate = useCallback(
    (href: string) => {
      setIsOpen(false);
      router.push(href);
    },
    [router]
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && flatItems[activeIndex]) {
      navigate(flatItems[activeIndex].href);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const activeEl = listRef.current?.querySelector(
      `[data-index="${activeIndex}"]`
    );
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!isOpen) return null;

  let itemIdx = 0;

  return (
    <div className="global-search-overlay" onClick={() => setIsOpen(false)}>
      <div
        className="global-search-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="global-search-input-wrapper">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#A09F9F"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, actions..."
            className="global-search-input"
          />
          <kbd className="global-search-kbd">ESC</kbd>
        </div>

        {/* Results */}
        <div className="global-search-results" ref={listRef}>
          {flatItems.length === 0 ? (
            <div className="global-search-empty">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            Object.entries(grouped).map(([section, items]) => (
              <div key={section}>
                <div className="global-search-section">{section}</div>
                {items.map((item) => {
                  const idx = itemIdx++;
                  return (
                    <button
                      key={`${item.href}-${item.label}`}
                      type="button"
                      data-index={idx}
                      onClick={() => navigate(item.href)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`global-search-item ${
                        idx === activeIndex ? "global-search-item--active" : ""
                      }`}
                    >
                      <span className="global-search-item-label">
                        {item.label}
                      </span>
                      {idx === activeIndex && (
                        <span className="global-search-item-hint">
                          Enter to select
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="global-search-footer">
          <div className="global-search-footer-keys">
            <kbd className="global-search-kbd-small">↑</kbd>
            <kbd className="global-search-kbd-small">↓</kbd>
            <span>to navigate</span>
          </div>
          <div className="global-search-footer-keys">
            <kbd className="global-search-kbd-small">↵</kbd>
            <span>to select</span>
          </div>
          <div className="global-search-footer-keys">
            <kbd className="global-search-kbd-small">esc</kbd>
            <span>to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
