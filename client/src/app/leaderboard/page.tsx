"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getSessionId } from "@/lib/session";
import type { LeaderboardEntry } from "@/lib/types";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const sessionId = typeof window !== "undefined" ? getSessionId() : "";

  useEffect(() => {
    apiFetch<LeaderboardEntry[]>("/api/leaderboard")
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          Home
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-zinc-400">No submissions yet. Be the first!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => {
            const rank = i + 1;
            const isMe = entry.session_id === sessionId;
            return (
              <div
                key={entry.session_id}
                className={`flex items-center gap-4 rounded-xl px-4 py-3 ${
                  isMe
                    ? "bg-zinc-700/60 border border-zinc-600"
                    : "bg-zinc-800/50 border border-zinc-700/40"
                }`}
              >
                <div className="w-8 text-center shrink-0">
                  {rank <= 3 ? (
                    <span className="text-lg">
                      {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
                    </span>
                  ) : (
                    <span className="text-sm text-zinc-500 font-mono">{rank}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {entry.username}
                    {isMe && (
                      <span className="ml-2 text-xs text-zinc-400">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {entry.validated} verified of {entry.total} submitted
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold tabular-nums">{entry.score}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">pts</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
