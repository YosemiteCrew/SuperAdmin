import { getData, patchData } from "@/app/services/http";

const BASE = "/v1/contact-us";

export type ContactRequest = {
  _id: string;
  subject: string;
  message: string;
  email: string;
  fullName: string;
  phone: string;
  type: "GENERAL_ENQUIRY" | "FEATURE_REQUEST" | "DSAR" | "COMPLAINT";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  source: "MOBILE_APP" | "PMS_WEB" | "MARKETING_SITE";
  assigneeId: string | null;
  assigneeName: string | null;
  internalNotes: string;
  createdAt: string;
  updatedAt: string;
};

export type DashboardStats = {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  byType: { _id: string; count: number }[];
  byPriority: { _id: string; count: number }[];
};

export async function listRequests(filters?: {
  status?: string;
  type?: string;
}): Promise<ContactRequest[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.type) params.set("type", filters.type);
  const query = params.toString();
  const { data } = await getData<ContactRequest[]>(
    `${BASE}/requests${query ? `?${query}` : ""}`
  );
  return data;
}

export async function getRequest(id: string): Promise<ContactRequest> {
  const { data } = await getData<ContactRequest>(`${BASE}/requests/${id}`);
  return data;
}

export async function updateStatus(
  id: string,
  status: string
): Promise<ContactRequest> {
  const { data } = await patchData<ContactRequest>(
    `${BASE}/requests/${id}/status`,
    { status }
  );
  return data;
}

export async function updatePriority(
  id: string,
  priority: string
): Promise<ContactRequest> {
  const { data } = await patchData<ContactRequest>(
    `${BASE}/requests/${id}/priority`,
    { priority }
  );
  return data;
}

export async function assignRequest(
  id: string,
  assigneeId: string,
  assigneeName: string
): Promise<ContactRequest> {
  const { data } = await patchData<ContactRequest>(
    `${BASE}/requests/${id}/assign`,
    { assigneeId, assigneeName }
  );
  return data;
}

export async function getStats(): Promise<DashboardStats> {
  const { data } = await getData<DashboardStats>(
    `${BASE}/dashboard/stats`
  );
  return data;
}
