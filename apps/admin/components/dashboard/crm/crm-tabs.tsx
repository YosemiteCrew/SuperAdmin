"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const CRM_TABS = [
  { id: "all", label: "All", href: "/client-crm" },
  { id: "hospitals", label: "Hospitals", href: "/client-crm/hospitals" },
  { id: "groomers", label: "Groomers", href: "/client-crm/groomers" },
  { id: "breeders", label: "Breeders", href: "/client-crm/breeders" },
  { id: "sitters", label: "Sitters", href: "/client-crm/sitters" },
  { id: "pet-parents", label: "Pet Parents", href: "/client-crm/pet-parents" },
  { id: "developers", label: "Developers", href: "/client-crm/developers" },
];

const PENDING_TABS = [
  { id: "hospitals", label: "Hospitals", count: 5, href: "/client-crm/hospitals" },
  { id: "groomers", label: "Groomers", count: 2, href: "/client-crm/groomers" },
  { id: "breeders", label: "Breeders", count: 0, href: "/client-crm/breeders" },
  { id: "sitters", label: "Sitters", count: 0, href: "/client-crm/sitters" },
];

function getActiveSegment(pathname: string | null): string {
  if (!pathname?.startsWith("/client-crm")) return "all";
  const segment = pathname.replace("/client-crm", "").replace(/^\//, "").split("/")[0];
  if (!segment) return "all";
  return segment;
}

export function CrmTabs() {
  const pathname = usePathname();
  const activeSegment = getActiveSegment(pathname);

  return (
    <div className="flex flex-wrap gap-1 overflow-x-auto">
      {CRM_TABS.map((tab) => {
        const isActive =
          (tab.id === "all" && activeSegment === "all") ||
          (tab.id !== "all" && activeSegment === tab.id);
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "border-[#3267D3] text-[#3267D3]"
                : "border-transparent text-gray-500 hover:text-[#302F2E]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

export function CrmPendingTabs() {
  const pathname = usePathname();
  const activeSegment = getActiveSegment(pathname);
  const effectiveActive = activeSegment === "all" ? "hospitals" : activeSegment;

  return (
    <div className="mb-4 flex gap-1 overflow-x-auto">
      {PENDING_TABS.map((tab) => {
        const isActive = effectiveActive === tab.id;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`relative whitespace-nowrap rounded-[25px] border px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "border-[#3267D3] text-[#3267D3]"
                : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                {tab.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
