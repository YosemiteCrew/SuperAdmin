"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_GROUP_1 = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "#", label: "Content Management" },
  { href: "/client-crm", label: "Client & CRM" },
];

const NAV_GROUP_2 = [
  { href: "#", label: "Analytics & Reports" },
  { href: "#", label: "Financials" },
  { href: "#", label: "User Management" },
  { href: "#", label: "Communication" },
];

const CLIENT_CRM_SUBTITLES = [
  { href: "/client-crm", label: "All Businesses" },
  { href: "/client-crm/hospitals", label: "Hospitals" },
  { href: "/client-crm/groomers", label: "Groomers" },
  { href: "/client-crm/breeders", label: "Breeders" },
  { href: "/client-crm/sitters", label: "Sitters" },
  { href: "/client-crm/pet-parents", label: "Pet Parents" },
  { href: "/client-crm/developers", label: "Developers" },
  { href: "/client-crm/support-tickets", label: "Support Tickets" },
  { href: "/client-crm/business-leads", label: "Business Leads" },
];

export function Sidebar() {
  const pathname = usePathname();
  const isClientCrm = pathname?.startsWith("/client-crm");
  const isDashboard = pathname === "/dashboard";

  const getNavItemStyles = (href: string, isSubtitle = false) => {
    const isActive =
      isSubtitle
        ? pathname === href ||
          (href === "/client-crm" && pathname === "/client-crm")
        : (href === "/dashboard" && isDashboard) ||
          (href === "/client-crm" && isClientCrm);

    if (isSubtitle) {
      const base = "block rounded-xl px-4 py-2.5 text-base font-normal transition-colors";
      const active = "border-2 border-blue-500 bg-blue-50/50 text-blue-600";
      const inactive = "text-[#302F2E] hover:bg-gray-50/50";
      return `${base} ${isActive ? active : inactive}`;
    }

    const base =
      "block rounded-xl border-2 px-5 py-2.5 text-base font-normal transition-colors";
    const active = "border-blue-500 bg-blue-50/50 text-blue-600";
    const inactive =
      "border-gray-200 bg-transparent text-[#5C5C5C] hover:border-gray-300 hover:bg-gray-50/50";
    return `${base} ${isActive ? active : inactive}`;
  };

  return (
    <aside className="fixed left-4 right-auto top-20 z-20 hidden h-[calc(100vh-5rem)] min-h-0 w-64 flex-col overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-lg lg:flex">
      <nav className="flex flex-col gap-2">
        {NAV_GROUP_1.map((item) => (
          <div key={item.label}>
            <Link href={item.href} className={getNavItemStyles(item.href)}>
              {item.label}
            </Link>
            {item.label === "Client & CRM" && isClientCrm && (
              <div className="mt-2 space-y-2 border-l-2 border-gray-100 pl-4">
                {CLIENT_CRM_SUBTITLES.map((sub) => (
                  <Link
                    key={sub.label}
                    href={sub.href}
                    className={getNavItemStyles(sub.href, true)}
                  >
                    {sub.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
        <p className="py-5 text-sm font-normal text-[#5C5C5C]">Developers</p>
        {NAV_GROUP_2.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={getNavItemStyles(item.href)}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
