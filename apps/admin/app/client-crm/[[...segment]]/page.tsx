import { DashboardLayout } from "../../../components/dashboard/dashboard-layout";

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
