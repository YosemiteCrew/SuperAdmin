const base =
  process.env.NEXT_PUBLIC_API_BASE_URL || process.env.BASE_URL;
export const apiBaseUrl = (base ?? "http://localhost:4000").replace(/\/$/, "");
