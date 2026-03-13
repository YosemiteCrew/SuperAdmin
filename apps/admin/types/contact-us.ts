export type RequestType =
  | "GENERAL_ENQUIRY"
  | "FEATURE_REQUEST"
  | "DSAR"
  | "COMPLAINT";

export type RequestSource = "MOBILE_APP" | "PMS_WEB" | "MARKETING_SITE";

export type RequestStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export interface DsarDetails {
  requesterType: string;
  lawBasis: string;
  rightsRequested: string[];
  declarationAccepted: boolean;
  declarationAcceptedAt?: string;
}

export interface ContactUsRequest {
  _id: string;
  type: RequestType;
  source: RequestSource;
  subject: string;
  message: string;
  email: string;
  attachments: string[];
  status: RequestStatus;
  dsarDetails?: DsarDetails;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export interface ByStatusCount {
  OPEN?: number;
  IN_PROGRESS?: number;
  RESOLVED?: number;
  CLOSED?: number;
}

export interface TypeStats {
  count: number;
  byStatus: ByStatusCount;
}

export interface DashboardStats {
  total: {
    count: number;
    byStatus: ByStatusCount;
  };
  byType: Record<RequestType, TypeStats>;
  bySource: Record<string, number>;
}
