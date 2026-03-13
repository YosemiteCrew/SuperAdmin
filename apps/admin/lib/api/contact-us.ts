import type {
  ContactUsRequest,
  DashboardStats,
  RequestStatus,
  RequestType,
} from "../../types/contact-us";
import { apiBaseUrl } from "../env";

const BASE = `${apiBaseUrl}/v1/contact-us`;

async function handleRes<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { message?: string }).message ?? `Request failed: ${res.status}`
    );
  }
  return data as T;
}

export async function listRequests(params?: {
  type?: RequestType;
  status?: RequestStatus;
}): Promise<ContactUsRequest[]> {
  const q = new URLSearchParams();
  if (params?.type) q.set("type", params.type);
  if (params?.status) q.set("status", params.status);
  const url = q.toString() ? `${BASE}/requests?${q}` : `${BASE}/requests`;
  const res = await fetch(url);
  return handleRes<ContactUsRequest[]>(res);
}

export async function getRequest(id: string): Promise<ContactUsRequest> {
  const res = await fetch(`${BASE}/requests/${id}`);
  return handleRes<ContactUsRequest>(res);
}

export async function updateRequestStatus(
  id: string,
  status: RequestStatus
): Promise<ContactUsRequest> {
  const res = await fetch(`${BASE}/requests/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return handleRes<ContactUsRequest>(res);
}

export async function getDashboardStats(params?: {
  from?: string;
  to?: string;
}): Promise<DashboardStats> {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  const url = q.toString() ? `${BASE}/dashboard/stats?${q}` : `${BASE}/dashboard/stats`;
  const res = await fetch(url);
  return handleRes<DashboardStats>(res);
}
