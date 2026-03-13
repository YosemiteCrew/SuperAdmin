"use client";

import { CrmSegmentDashboard } from "./crm-segment-dashboard";
import { SITTERS_DATA } from "./crm-segment-data";

export function CrmSittersDashboard() {
  return (
    <CrmSegmentDashboard
      title="CRM Dashboard - Sitters"
      breadcrumbLabel="Sitters"
      badgeText="5 Practices Awaiting Verification"
      statCards={SITTERS_DATA.statCards}
      pendingCount={5}
      pendingRows={SITTERS_DATA.pendingRows}
      practiceRows={SITTERS_DATA.practiceRows}
      practiceTotalCount={140}
      practiceColumns={SITTERS_DATA.practiceColumns}
      mostUsedFeatures={SITTERS_DATA.mostUsedFeatures}
      dropOffIndicators={SITTERS_DATA.dropOffIndicators}
    />
  );
}
