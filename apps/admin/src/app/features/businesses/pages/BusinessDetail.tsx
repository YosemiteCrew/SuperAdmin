"use client";
import { useEffect, useState } from "react";
import { useBusinessStore } from "@/app/stores/businessStore";
import PageHeader from "@/app/ui/primitives/PageHeader";
import DetailCard from "@/app/ui/cards/DetailCard";
import { Primary, Secondary } from "@/app/ui/primitives/Button";
import { Danger } from "@/app/ui/primitives/Button";
import { SkeletonDetailPage } from "@/app/ui/primitives/Skeleton";
import Breadcrumb from "@/app/ui/primitives/Breadcrumb";
import BusinessStatusBadge from "../components/BusinessStatusBadge";
import BusinessActionModal from "../components/BusinessActionModal";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type ActionType = "approve" | "suspend" | "deactivate";

export default function BusinessDetail({ id }: { id: string }) {
  const {
    selectedBusiness,
    loading,
    fetchBusinessById,
    approveBusiness,
    suspendBusiness,
    deactivateBusiness,
  } = useBusinessStore();
  const [actionModal, setActionModal] = useState<{ open: boolean; action: ActionType }>({
    open: false,
    action: "approve",
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchBusinessById(id);
  }, [id, fetchBusinessById]);

  if (loading || !selectedBusiness) {
    return <SkeletonDetailPage cards={3} />;
  }

  const handleAction = async () => {
    switch (actionModal.action) {
      case "approve":
        await approveBusiness(selectedBusiness.id);
        break;
      case "suspend":
        await suspendBusiness(selectedBusiness.id);
        break;
      case "deactivate":
        await deactivateBusiness(selectedBusiness.id);
        break;
    }
  };

  const status = selectedBusiness.status;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "Businesses", href: "/businesses" },
          { label: selectedBusiness.name },
        ]}
      />

      <PageHeader
        title={selectedBusiness.name}
        action={<BusinessStatusBadge status={selectedBusiness.status} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DetailCard
          title="Business Information"
          rows={[
            { label: "Name", value: selectedBusiness.name },
            {
              label: "Type",
              value:
                selectedBusiness.type.charAt(0) +
                selectedBusiness.type.slice(1).toLowerCase(),
            },
            { label: "Phone", value: selectedBusiness.phone },
            { label: "Website", value: selectedBusiness.website },
            { label: "Address", value: selectedBusiness.address },
            {
              label: "Plan",
              value:
                selectedBusiness.plan.charAt(0).toUpperCase() +
                selectedBusiness.plan.slice(1),
            },
          ]}
        />
        <DetailCard
          title="Owner Details"
          rows={[
            { label: "Name", value: selectedBusiness.ownerName },
            { label: "Email", value: selectedBusiness.ownerEmail },
          ]}
        />
        <DetailCard
          title="Status & Dates"
          rows={[
            {
              label: "Status",
              value: <BusinessStatusBadge status={selectedBusiness.status} />,
            },
            {
              label: "Verified",
              value: selectedBusiness.isVerified ? "Yes" : "No",
            },
            {
              label: "Rating",
              value: `${selectedBusiness.averageRating.toFixed(1)} (${selectedBusiness.ratingCount} reviews)`,
            },
            { label: "Created", value: formatDate(selectedBusiness.createdAt) },
            { label: "Approved", value: formatDate(selectedBusiness.approvedAt) },
            {
              label: "Invited By",
              value: selectedBusiness.invitedBy ?? "N/A",
            },
          ]}
        />
      </div>

      <div className="flex items-center gap-3">
        {(status === "pending" || status === "invited") && (
          <Primary
            onClick={() => setActionModal({ open: true, action: "approve" })}
          >
            Approve
          </Primary>
        )}
        {status === "active" && (
          <Secondary
            onClick={() => setActionModal({ open: true, action: "suspend" })}
          >
            Suspend
          </Secondary>
        )}
        {(status === "active" || status === "suspended") && (
          <Danger
            onClick={() => setActionModal({ open: true, action: "deactivate" })}
          >
            Deactivate
          </Danger>
        )}
      </div>

      <BusinessActionModal
        isOpen={actionModal.open}
        onClose={() => setActionModal({ open: false, action: actionModal.action })}
        action={actionModal.action}
        businessName={selectedBusiness.name}
        onConfirm={handleAction}
      />
    </div>
  );
}
