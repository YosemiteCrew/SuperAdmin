export type DeveloperStatus = "active" | "inactive" | "suspended";
export type AppStatus = "active" | "pending_review" | "rejected" | "suspended";

export type Developer = {
  id: string;
  name: string;
  email: string;
  company: string;
  status: DeveloperStatus;
  appsCount: number;
  createdAt: string;
};

export type DeveloperApp = {
  id: string;
  developerId: string;
  name: string;
  description: string;
  status: AppStatus;
  apiKey: string;
  callsToday: number;
  callsTotal: number;
  createdAt: string;
};
