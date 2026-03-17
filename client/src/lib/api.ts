export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/** Submission image URL: proxy Firebase through API to avoid CORS; local /uploads stay direct */
export function submissionImageUrl(imageUrl: string | null | undefined): string {
  const url = typeof imageUrl === "string" ? imageUrl.trim() : "";
  if (!url) return "";
  const base = API_BASE.replace(/\/$/, "");
  if (url.startsWith("https://firebasestorage.googleapis.com/") || url.startsWith("https://storage.googleapis.com/")) {
    return `${base}/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
}

export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API ${res.status}`);
  }
  return res.json();
}
