export type BusinessType = "HOSPITAL" | "BREEDER" | "BOARDER" | "GROOMER";
export type BusinessStatus =
  | "pending"
  | "active"
  | "suspended"
  | "deactivated"
  | "invited";
export type BusinessPlan = "free" | "business";

export type VerificationStatus = "pending" | "approved" | "rejected";

export type VerificationRequest = {
  id: string;
  businessId: string;
  businessName: string;
  type: BusinessType;
  status: VerificationStatus;
  profileCompletion: number;
  submittedAt: string;
  country: string;
  registrationNumber: string;
  phone: string;
  email: string;
  website: string;
  postalCode: string;
  area: string;
  city: string;
  state: string;
  hasDepartments: boolean;
  services: string[];
  departments: string[];
  rejectionReason?: string;
};

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
