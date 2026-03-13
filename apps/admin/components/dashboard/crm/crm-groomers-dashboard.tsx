"use client";

import { CrmSegmentDashboard } from "./crm-segment-dashboard";
import { GROOMERS_DATA } from "./crm-segment-data";

export function CrmGroomersDashboard() {
  return (
    <CrmSegmentDashboard
      title="CRM Dashboard - Groomers"
      breadcrumbLabel="Groomers"
      badgeText="5 Practices Awaiting Verification"
      statCards={GROOMERS_DATA.statCards}
      pendingCount={5}
      pendingRows={GROOMERS_DATA.pendingRows}
      practiceRows={GROOMERS_DATA.practiceRows}
      practiceTotalCount={149}
      practiceColumns={GROOMERS_DATA.practiceColumns}
      mostUsedFeatures={GROOMERS_DATA.mostUsedFeatures}
      dropOffIndicators={GROOMERS_DATA.dropOffIndicators}
    />
  );
}
