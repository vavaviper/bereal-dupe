"use client";

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("user_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("user_session_id", id);
  }
  return id;
}

export function getUsername(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("candid_username");
}

export function setUsername(name: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("candid_username", name);
}

export function hasUsername(): boolean {
  return !!getUsername();
}
