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
