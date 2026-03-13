"use client";

import { CrmSegmentDashboard } from "./crm-segment-dashboard";
import { BREEDERS_DATA } from "./crm-segment-data";

export function CrmBreedersDashboard() {
  return (
    <CrmSegmentDashboard
      title="CRM Dashboard - Breeders"
      breadcrumbLabel="Breeders"
      badgeText="5 Practices Awaiting Verification"
      statCards={BREEDERS_DATA.statCards}
      pendingCount={5}
      pendingRows={BREEDERS_DATA.pendingRows}
      practiceRows={BREEDERS_DATA.practiceRows}
      practiceTotalCount={140}
      practiceColumns={BREEDERS_DATA.practiceColumns}
      mostUsedFeatures={BREEDERS_DATA.mostUsedFeatures}
      dropOffIndicators={BREEDERS_DATA.dropOffIndicators}
    />
  );
}
