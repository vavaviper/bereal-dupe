export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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
