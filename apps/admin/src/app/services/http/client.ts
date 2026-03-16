import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { apiBaseUrl } from "@/app/lib/env";

const instance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor - add auth token
instance.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem("sa_access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor - handle errors
instance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("sa_access_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export type HttpResponse<T> = {
  data: T;
  status: number;
};

export async function getData<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<HttpResponse<T>> {
  const res = await instance.get<T>(url, config);
  return { data: res.data, status: res.status };
}

export async function postData<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<HttpResponse<T>> {
  const res = await instance.post<T>(url, body, config);
  return { data: res.data, status: res.status };
}

export async function patchData<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<HttpResponse<T>> {
  const res = await instance.patch<T>(url, body, config);
  return { data: res.data, status: res.status };
}

export async function deleteData<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<HttpResponse<T>> {
  const res = await instance.delete<T>(url, config);
  return { data: res.data, status: res.status };
}
