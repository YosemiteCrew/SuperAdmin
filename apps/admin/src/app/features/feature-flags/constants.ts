export const FEATURE_FLAGS = {
  activityPub: {
    label: 'ActivityPub federation',
    description: 'Allow self-hosted PIMS instances to federate via the AP protocol.',
  },
  betaReporting: {
    label: 'Beta reporting',
    description: 'Early access to new analytics dashboards before general release.',
  },
  advancedExport: {
    label: 'Advanced export',
    description: 'CSV and PDF export for records beyond the default retention window.',
  },
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;
