const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
export const apiBaseUrl = base.replace(/\/$/, "");
