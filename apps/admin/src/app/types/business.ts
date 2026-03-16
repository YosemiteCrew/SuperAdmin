export type BusinessType = "HOSPITAL" | "BREEDER" | "BOARDER" | "GROOMER";
export type BusinessStatus =
  | "pending"
  | "active"
  | "suspended"
  | "deactivated"
  | "invited";
export type BusinessPlan = "free" | "business";

export type Business = {
  id: string;
  name: string;
  type: BusinessType;
  status: BusinessStatus;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  website: string;
  address: string;
  plan: BusinessPlan;
  isVerified: boolean;
  averageRating: number;
  ratingCount: number;
  createdAt: string;
  approvedAt: string | null;
  invitedBy: string | null;
};
