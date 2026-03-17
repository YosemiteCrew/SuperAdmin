"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBusinessStore } from "@/app/stores/businessStore";
import Badge from "@/app/ui/primitives/Badge";
import { Primary, Secondary } from "@/app/ui/primitives/Button";
import { SkeletonDetailPage } from "@/app/ui/primitives/Skeleton";
import ReadOnlyField from "@/app/ui/inputs/ReadOnlyField";
import Breadcrumb from "@/app/ui/primitives/Breadcrumb";
import Avatar from "@/app/ui/primitives/Avatar";
import RejectVerificationModal from "../components/RejectVerificationModal";

function formatSubmittedAt(dateStr: string) {
  const submitted = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - submitted.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  let relative: string;
  if (diffDays > 0) relative = `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  else if (diffHours > 0)
    relative = `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  else relative = "Just now";

  const formatted = submitted.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = submitted.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `Request Submitted: ${relative} [ ${formatted} ${time} ]`;
}

export default function VerificationDetail({ id }: { id: string }) {
  const {
    selectedVerification,
    verificationsLoading,
    fetchVerificationById,
    approveVerification,
    rejectVerification,
  } = useBusinessStore();
  const router = useRouter();
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchVerificationById(id);
  }, [id, fetchVerificationById]);

  if (verificationsLoading || !selectedVerification) {
    return <SkeletonDetailPage cards={3} />;
  }

  const ver = selectedVerification;
  const isPending = ver.status === "pending";
  const isApproved = ver.status === "approved";
  const isRejected = ver.status === "rejected";
  const typeLabel =
    ver.type.charAt(0) + ver.type.slice(1).toLowerCase() + "s";

  const statusBadge = isPending
    ? { tone: "warning" as const, label: "Pending Verification" }
    : isApproved
      ? { tone: "success" as const, label: "Approved" }
      : { tone: "danger" as const, label: "Rejected" };

  const handleApprove = async () => {
    await approveVerification(ver.id);
  };

  const handleReject = async (reason: string) => {
    await rejectVerification(ver.id, reason);
    setRejectModalOpen(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "Businesses", href: "/businesses" },
          { label: typeLabel, href: "/businesses" },
          { label: "Verifications" },
          { label: ver.businessName },
        ]}
      />

      {/* Title + Actions */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-heading-1 text-text-primary">
              {ver.businessName}
            </h1>
            <Badge tone={statusBadge.tone}>{statusBadge.label}</Badge>
          </div>

          {isPending && (
            <div className="flex items-center gap-2">
              <Primary onClick={handleApprove}>
                <span className="flex items-center gap-2">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  Approve
                </span>
              </Primary>
              <Secondary onClick={() => setRejectModalOpen(true)}>
                <span className="flex items-center gap-2">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
                  </svg>
                  Reject
                </span>
              </Secondary>
            </div>
          )}
        </div>
        <p className="text-caption-1 font-bold text-text-tertiary">
          {formatSubmittedAt(ver.submittedAt)}
        </p>
      </div>

      {/* Rejection Reason */}
      {isRejected && ver.rejectionReason && (
        <div className="flex gap-4 items-start p-5 bg-danger-50 border border-danger-200 rounded-2xl">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="shrink-0 mt-0.5"
          >
            <path
              d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"
              fill="#EA3729"
            />
          </svg>
          <div className="flex flex-col gap-1">
            <span className="text-body-4-emphasis text-danger-600">
              Rejection Reason
            </span>
            <p className="text-body-4 text-text-primary">
              {ver.rejectionReason}
            </p>
          </div>
        </div>
      )}

      {/* Business Information */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-body-4-emphasis text-text-secondary">
            Business Information
          </h3>
        </div>
        <div
          className="rounded-3xl p-10 flex flex-col gap-10"
          style={{ border: "1px solid rgba(93, 65, 47, 0.15)" }}
        >
          {/* Avatar + Name */}
          <div className="flex items-center gap-5">
            <Avatar name={ver.businessName} size={40} />
            <span className="text-heading-3 text-text-secondary">
              {ver.businessName}
            </span>
          </div>

          {/* Fields */}
          <div className="flex flex-col gap-7">
            <div className="flex gap-4">
              <ReadOnlyField label="Country" value={ver.country} />
              <ReadOnlyField
                label="Business Registration Number/PIMS ID"
                value={ver.registrationNumber}
              />
            </div>
            <div className="flex gap-4">
              <ReadOnlyField label="Business Name" value={ver.businessName} />
              <ReadOnlyField label="Phone Number" value={ver.phone} />
            </div>
            <div className="flex gap-4">
              <ReadOnlyField label="Email Address" value={ver.email} />
              <ReadOnlyField label="Website" value={ver.website} />
            </div>
          </div>
        </div>
      </section>

      {/* Address Information */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-body-4-emphasis text-text-secondary">
            Address Information
          </h3>
        </div>
        <div
          className="rounded-3xl p-10 flex flex-col gap-7"
          style={{ border: "1px solid rgba(93, 65, 47, 0.15)" }}
        >
          <div className="flex gap-4">
            <ReadOnlyField label="Postal Code" value={ver.postalCode} />
            <ReadOnlyField label="Area" value={ver.area} />
          </div>
          <div className="flex gap-4">
            <ReadOnlyField label="City" value={ver.city} />
            <ReadOnlyField label="State" value={ver.state} />
          </div>
        </div>
      </section>

      {/* Services & Departments */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-body-4-emphasis text-text-secondary">
            Services & Departments
          </h3>
        </div>
        <div
          className="rounded-3xl p-10 flex flex-col gap-10"
          style={{ border: "1px solid rgba(93, 65, 47, 0.15)" }}
        >
          {/* Has departments */}
          <div className="flex items-center justify-between py-1.5">
            <span className="text-heading-3 text-text-primary">
              Does the business have specialised departments?
            </span>
            <span className="inline-flex items-center justify-center px-5 py-0 rounded-full border border-brand-950 bg-brand-50 text-body-4-emphasis text-brand-950 h-12">
              {ver.hasDepartments ? "Yes" : "No"}
            </span>
          </div>

          {/* Services */}
          {ver.services.length > 0 && (
            <div className="flex flex-col gap-3 py-1.5">
              <h4 className="text-heading-3 text-text-primary">
                Services Offered
              </h4>
              <ul className="flex flex-col gap-1 pl-5 list-disc">
                {ver.services.map((s) => (
                  <li
                    key={s}
                    className="text-body-4-emphasis text-text-secondary leading-relaxed"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Departments */}
          {ver.hasDepartments && ver.departments.length > 0 && (
            <div className="flex flex-col gap-3 py-1.5">
              <h4 className="text-heading-3 text-text-primary">
                Departments
              </h4>
              <ol className="flex flex-col gap-1 pl-5 list-decimal">
                {ver.departments.map((d) => (
                  <li
                    key={d}
                    className="text-body-4-emphasis text-text-secondary leading-relaxed"
                  >
                    {d}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </section>

      {/* Reject Modal */}
      <RejectVerificationModal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        businessName={ver.businessName}
        onReject={handleReject}
      />
    </div>
  );
}
