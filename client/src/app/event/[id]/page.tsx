"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, API_BASE } from "@/lib/api";
import type { Event, Prompt, Submission } from "@/lib/types";
import Countdown from "@/components/Countdown";

const POLL_INTERVAL = 30_000;

export default function CanvasPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingSub, setViewingSub] = useState<Submission | null>(null);

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
            className="break-inside-avoid rounded-xl overflow-hidden bg-zinc-800/50 border border-zinc-700/50 md:cursor-pointer"
            onClick={() => setViewingSub(sub)}
          >
            <div className="relative">
              <img
                src={`${API_BASE}${sub.image_url}`}
                alt="Submission"
                className="w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  const el = e.currentTarget;
                  el.style.display = "none";
                  el.parentElement?.classList.add("min-h-[120px]", "flex", "items-center", "justify-center");
                  const span = document.createElement("span");
                  span.className = "text-zinc-600 text-xs";
                  span.textContent = "Image unavailable";
                  el.parentElement?.appendChild(span);
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

      {viewingSub && (
        <PhotoModal
          sub={viewingSub}
          onClose={() => setViewingSub(null)}
          onPrev={() => {
            const idx = submissions.findIndex((s) => s.id === viewingSub.id);
            if (idx > 0) setViewingSub(submissions[idx - 1]);
          }}
          onNext={() => {
            const idx = submissions.findIndex((s) => s.id === viewingSub.id);
            if (idx < submissions.length - 1) setViewingSub(submissions[idx + 1]);
          }}
        />
      )}
    </main>
  );
}

/* ── Desktop-only photo modal ── */

function PhotoModal({
  sub,
  onClose,
  onPrev,
  onNext,
}: {
  sub: Submission;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onPrev, onNext]);

  return (
    <div
      className="hidden md:fixed md:inset-0 md:z-50 md:flex md:items-center md:justify-center md:bg-black/80 md:backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Prev arrow */}
      <button
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors p-2"
        aria-label="Previous photo"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
      </button>

      {/* Photo card */}
      <div
        className="relative max-w-2xl w-full mx-4 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>

        <img
          src={`${API_BASE}${sub.image_url}`}
          alt="Submission"
          className="w-full max-h-[80vh] object-contain bg-black"
        />

        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-zinc-400">
            {new Date(sub.submitted_at).toLocaleString()}
          </span>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              sub.validated
                ? "bg-green-900/80 text-green-300 border border-green-700/50"
                : "bg-yellow-900/80 text-yellow-300 border border-yellow-700/50"
            }`}
          >
            {sub.validated ? "Verified" : "Unverified"}
          </span>
        </div>
      </div>

      {/* Next arrow */}
      <button
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors p-2"
        aria-label="Next photo"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
    </div>
  );
}
