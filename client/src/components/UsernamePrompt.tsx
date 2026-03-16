"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { getSessionId, getUsername, setUsername as saveUsername, hasUsername } from "@/lib/session";

export default function UsernamePrompt() {
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hasUsername() && getSessionId()) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await apiFetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: getSessionId(), username: trimmed }),
      });
      saveUsername(trimmed);
      setShow(false);
    } catch {
      saveUsername(trimmed);
      setShow(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-1">Pick a username</h2>
        <p className="text-sm text-zinc-400 mb-4">
          This will show on your submissions and the leaderboard.
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="Your name..."
          maxLength={24}
          autoFocus
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 mb-4"
        />
        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="w-full bg-white text-black font-semibold rounded-lg py-2.5 text-sm hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Continue"}
        </button>
      </div>
    </div>
  );
}
