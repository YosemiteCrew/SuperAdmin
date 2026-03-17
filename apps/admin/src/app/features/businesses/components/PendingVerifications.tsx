"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useBusinessStore } from "@/app/stores/businessStore";
import { GenericTable, type Column } from "@/app/ui/tables/GenericTable";
import ActionViewButton from "@/app/ui/primitives/ActionViewButton";
import Badge from "@/app/ui/primitives/Badge";
import type {
  VerificationRequest,
  VerificationStatus,
  BusinessType,
} from "@/app/types/business";

const tabs: { label: string; type: BusinessType }[] = [
  { label: "Hospitals", type: "HOSPITAL" },
  { label: "Groomers", type: "GROOMER" },
  { label: "Breeders", type: "BREEDER" },
  { label: "Sitters", type: "BOARDER" },
];

const verificationStatusConfig: Record<
  VerificationStatus,
  { tone: "warning" | "success" | "danger"; label: string }
> = {
  pending: { tone: "warning", label: "Pending" },
  approved: { tone: "success", label: "Approved" },
  rejected: { tone: "danger", label: "Rejected" },
};

function formatPendingSince(dateStr: string) {
  const now = new Date();
  const submitted = new Date(dateStr);
  const diffMs = now.getTime() - submitted.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""}`;
  if (diffHours > 0) return `${diffHours} hr${diffHours > 1 ? "s" : ""}`;
  return "Just now";
}

type VerificationRow = VerificationRequest & Record<string, unknown>;

export default function PendingVerifications() {
  const { verifications, fetchVerifications } = useBusinessStore();
  const [activeTab, setActiveTab] = useState<BusinessType>("HOSPITAL");
  const router = useRouter();

  useEffect(() => {
    fetchVerifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingCountByType = useMemo(() => {
    const counts: Record<BusinessType, number> = {
      HOSPITAL: 0,
      GROOMER: 0,
      BREEDER: 0,
      BOARDER: 0,
    };
    for (const v of verifications) {
      if (v.status === "pending") counts[v.type]++;
    }
    return counts;
  }, [verifications]);

  const filteredByTab = useMemo(
    () => verifications.filter((v) => v.type === activeTab),
    [verifications, activeTab]
  );

  const columns: Column<VerificationRow>[] = [
    {
      label: "Practice Name",
      key: "businessName",
      render: (item) => (
        <span className="text-body-4-emphasis text-text-primary">
          {item.businessName}
        </span>
      ),
    },
    {
      label: "Region",
      key: "city",
      render: (item) => (
        <div className="flex flex-col">
          <span className="text-body-4-emphasis text-text-primary">
            {String(item.city)}
          </span>
          <span className="text-caption-1 text-text-tertiary">
            {String(item.country)}
          </span>
        </div>
      ),
    },
    {
      label: "Profile Completion",
      key: "profileCompletion",
      render: (item) => (
        <span className="text-body-4-emphasis text-text-primary">
          {String(item.profileCompletion)}%
        </span>
      ),
    },
    {
      label: "Pending Since",
      key: "submittedAt",
      render: (item) => (
        <span className="text-body-4-emphasis text-text-primary">
          {formatPendingSince(String(item.submittedAt))}
        </span>
      ),
    },
    {
      label: "Status",
      key: "status",
      render: (item) => {
        const config =
          verificationStatusConfig[item.status as VerificationStatus];
        return <Badge tone={config.tone}>{config.label}</Badge>;
      },
    },
    {
      label: "Actions",
      key: "actions",
      render: (item) => (
        <ActionViewButton
          onClick={() =>
            router.push(`/businesses/verification/${item.id}`)
          }
        />
      ),
    },
  ];

  const totalPending = Object.values(pendingCountByType).reduce(
    (a, b) => a + b,
    0
  );
  if (verifications.length === 0 && totalPending === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-heading-2 text-text-primary">
          Pending Verifications
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex items-end gap-3 border-b border-card-border">
        {tabs.map((tab) => {
          const count = pendingCountByType[tab.type];
          const isActive = activeTab === tab.type;
          return (
            <button
              key={tab.type}
              type="button"
              onClick={() => setActiveTab(tab.type)}
              className={`flex items-center gap-2 px-3 h-[42px] text-body-4-emphasis transition-colors relative ${
                isActive
                  ? "text-text-primary"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span className="relative group">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[13px] font-bold text-neutral-0 bg-danger-600 cursor-default">
                    {count}
                  </span>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-neutral-950 text-neutral-0 text-[12px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50">
                    {count} pending verification{count > 1 ? "s" : ""}
                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-950" />
                  </span>
                </span>
              )}
              {/* Active indicator with smooth transition */}
              <span
                className={`absolute bottom-0 left-0 right-0 h-1 bg-brand-950 rounded-t transition-all duration-300 ease-in-out ${
                  isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Table content with min-height to prevent layout shift */}
      <div className="min-h-[300px]">
        {filteredByTab.length === 0 ? (
          <div className="flex items-center justify-center py-12 bg-neutral-0 border border-card-border rounded-2xl">
            <p className="text-body-4 text-text-tertiary">
              No verifications for this category.
            </p>
          </div>
        ) : (
          <GenericTable
            data={filteredByTab as VerificationRow[]}
            columns={columns}
            pageSize={5}
          />
        )}
      </div>

      {filteredByTab.length > 3 && (
        <div className="flex justify-center">
          <button
            type="button"
            className="px-6 py-3 rounded-full border border-neutral-950 text-text-primary text-body-4-emphasis transition-all duration-200 hover:bg-neutral-950 hover:text-neutral-0"
          >
            See All
          </button>
        </div>
      )}
    </div>
  );
}
