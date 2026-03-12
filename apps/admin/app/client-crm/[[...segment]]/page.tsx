import { DashboardLayout } from "../../../components/dashboard/dashboard-layout";
import { CrmDashboard } from "../../../components/dashboard/crm-dashboard";
import { CrmBreedersDashboard } from "../../../components/dashboard/crm-breeders-dashboard";
import { CrmGroomersDashboard } from "../../../components/dashboard/crm-groomers-dashboard";
import { CrmSittersDashboard } from "../../../components/dashboard/crm-sitters-dashboard";
import { CrmHospitalsDashboard } from "../../../components/dashboard/crm-hospitals-dashboard";

const SEGMENT_TITLES: Record<string, string> = {
  hospitals: "Hospitals",
  groomers: "Groomers",
  breeders: "Breeders",
  sitters: "Sitters",
  "pet-parents": "Pet Parents",
  developers: "Developers",
  "support-tickets": "Support Tickets",
  "business-leads": "Business Leads",
};

export default async function ClientCrmSegmentPage({
  params,
}: {
  params: Promise<{ segment?: string[] }>;
}) {
  const { segment } = await params;
  const slug = segment?.[0] || "";

  if (!slug) {
    return (
      <DashboardLayout>
        <CrmDashboard />
      </DashboardLayout>
    );
  }

  if (slug === "hospitals") {
    return (
      <DashboardLayout>
        <CrmHospitalsDashboard />
      </DashboardLayout>
    );
  }

  if (slug === "groomers") {
    return (
      <DashboardLayout>
        <CrmGroomersDashboard />
      </DashboardLayout>
    );
  }

  if (slug === "breeders") {
    return (
      <DashboardLayout>
        <CrmBreedersDashboard />
      </DashboardLayout>
    );
  }

  if (slug === "sitters") {
    return (
      <DashboardLayout>
        <CrmSittersDashboard />
      </DashboardLayout>
    );
  }

  const title = SEGMENT_TITLES[slug] || "All Businesses";

  return (
    <DashboardLayout>
      <div>
        <h1 className="text-2xl font-medium text-[#302F2E]">{title}</h1>
        <p className="mt-2 text-gray-500">Manage your clients and CRM data.</p>
      </div>
    </DashboardLayout>
  );
}
