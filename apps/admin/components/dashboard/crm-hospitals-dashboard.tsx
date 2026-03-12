"use client";

import { CrmSegmentDashboard } from "./crm-segment-dashboard";
import { HOSPITALS_DATA } from "./crm-segment-data";

export function CrmHospitalsDashboard() {
  return (
    <CrmSegmentDashboard
      title="CRM Dashboard - Hospitals"
      breadcrumbLabel="Hospitals"
      badgeText="5 Practices Awaiting Verification"
      statCards={HOSPITALS_DATA.statCards}
      pendingCount={5}
      pendingRows={HOSPITALS_DATA.pendingRows}
      practiceRows={HOSPITALS_DATA.practiceRows}
      practiceTotalCount={140}
      practiceColumns={HOSPITALS_DATA.practiceColumns}
      mostUsedFeatures={HOSPITALS_DATA.mostUsedFeatures}
      dropOffIndicators={HOSPITALS_DATA.dropOffIndicators}
    />
  );
}
