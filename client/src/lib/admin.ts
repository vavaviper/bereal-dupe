"use client";

import { API_BASE } from "./api";

export function setAdminPassword(eventId: string, password: string) {
  localStorage.setItem(`admin_pw_${eventId}`, password);
}

export function getAdminPassword(eventId: string): string | null {
  return localStorage.getItem(`admin_pw_${eventId}`);
}

export function clearAdminPassword(eventId: string) {
  localStorage.removeItem(`admin_pw_${eventId}`);
}

export async function adminFetch<T = unknown>(
  eventId: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const password = getAdminPassword(eventId);
  if (!password) throw new Error("Not authenticated");
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      "x-admin-password": password,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API ${res.status}`);
  }
  return res.json();
}
