"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, submissionImageUrl } from "@/lib/api";
import type { Event, Prompt, Submission } from "@/lib/types";
import Countdown from "@/components/Countdown";

const POLL_INTERVAL = 30_000;

export default function CanvasPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const ev = await apiFetch<Event>(`/api/events/${id}`);
      setEvent(ev);
      const data = await apiFetch<{ submissions: Submission[]; prompt: Prompt | null }>(
        `/api/events/${id}/submissions`
      );
      setPrompt(data.prompt);
      setSubmissions(data.submissions);
    } catch {
      /* event might not exist yet */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-zinc-400">Event not found.</p>
      </div>
    );
  }

  const isActive = prompt?.active && prompt.fired_at;

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
          <Link
            href="/leaderboard"
            className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            Leaderboard
            <span className="text-base">🏆</span>
          </Link>
        </div>

        {isActive && prompt ? (
          <div className="mt-3 rounded-xl bg-zinc-800/80 border border-zinc-700 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm text-zinc-400 uppercase tracking-wider">Current prompt</p>
              <p className="text-lg font-medium mt-1">{prompt.text}</p>
            </div>
            <div className="flex items-center gap-4">
              <Countdown firedAt={prompt.fired_at!} durationSeconds={prompt.duration_seconds} />
              <Link
                href={`/event/${id}/submit`}
                className="bg-white text-black font-semibold rounded-lg px-5 py-2.5 text-sm hover:bg-zinc-200 transition-colors"
              >
                Submit Photo
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50 p-8 text-center">
            <div className="text-3xl mb-2">📷</div>
            <p className="text-zinc-400">Waiting for the next prompt...</p>
          </div>
        )}
      </header>

      {submissions.length === 0 && isActive && (
        <p className="text-center text-zinc-500 mt-12">
          No submissions yet — be the first!
        </p>
      )}

      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
        {submissions.map((sub) => (
          <div
            key={sub.id}
            className="break-inside-avoid rounded-xl overflow-hidden bg-zinc-800/50 border border-zinc-700/50"
          >
            <div className="relative min-h-[120px] bg-zinc-800">
              <img
                src={submissionImageUrl(sub.image_url)}
                alt="Submission"
                className="w-full object-cover min-h-[120px]"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const el = e.currentTarget;
                  el.onerror = null;
                  el.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%233f3f46' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' fill='%2371717a' font-size='14' text-anchor='middle' dy='.3em'%3EImage unavailable%3C/text%3E%3C/svg%3E";
                }}
              />
              <span
                className={`absolute top-2 right-2 text-xs font-medium px-2 py-1 rounded-full ${
                  sub.validated
                    ? "bg-green-900/80 text-green-300 border border-green-700/50"
                    : "bg-yellow-900/80 text-yellow-300 border border-yellow-700/50"
                }`}
              >
                {sub.validated ? "Verified" : "Unverified"}
              </span>
            </div>
            <div className="px-3 py-2 text-xs text-zinc-500">
              {new Date(sub.submitted_at).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
