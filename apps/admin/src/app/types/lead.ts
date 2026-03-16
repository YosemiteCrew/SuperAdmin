export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "converted"
  | "lost";
export type LeadSource =
  | "website"
  | "referral"
  | "social_media"
  | "cold_outreach"
  | "partner";

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: LeadSource;
  status: LeadStatus;
  assigneeId: string | null;
  assigneeName: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};
