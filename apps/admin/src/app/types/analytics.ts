export type KpiTile = {
  label: string;
  value: number;
  previousValue: number;
  changePercent: number;
  trend: "up" | "down" | "flat";
};

export type ChartDataPoint = {
  date: string;
  value: number;
};

export type AnalyticsSummary = {
  totalAppUsers: number;
  totalPmsUsers: number;
  activeBusinesses: number;
  totalLeads: number;
  conversionRate: number;
  kpiTiles: KpiTile[];
  userTrend: ChartDataPoint[];
  businessTrend: ChartDataPoint[];
  leadsTrend: ChartDataPoint[];
};
