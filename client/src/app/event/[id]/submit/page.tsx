"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, API_BASE } from "@/lib/api";
import { getSessionId } from "@/lib/session";
import type { Event, Prompt } from "@/lib/types";
import Countdown from "@/components/Countdown";

export default function SubmitPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [eventName, setEventName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEvent = useCallback(async () => {
    try {
      const ev = await apiFetch<Event>(`/api/events/${id}`);
      setEventName(ev.name);
      setPrompt(ev.active_prompt ?? null);
    } catch {
      setError("Could not load event");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit() {
    if (!file || !prompt) return;
    setSubmitting(true);
    setError(null);

    const form = new FormData();
    form.append("image", file);
    form.append("user_session_id", getSessionId());

    try {
      await fetch(`${API_BASE}/api/events/${id}/submit`, {
        method: "POST",
        body: form,
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Upload failed (${res.status})`);
        }
      });
      router.push(`/event/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!prompt || !prompt.active || !prompt.fired_at) {
    return (
      <main className="max-w-md mx-auto px-4 py-12 text-center">
        <p className="text-zinc-400 text-lg">No active prompt right now.</p>
        <button
          onClick={() => router.push(`/event/${id}`)}
          className="mt-4 text-sm text-zinc-500 underline hover:text-zinc-300"
        >
          Back to event
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto px-4 py-8">
      <button
        onClick={() => router.push(`/event/${id}`)}
        className="text-sm text-zinc-500 hover:text-zinc-300 mb-4 inline-block"
      >
        ← Back to {eventName}
      </button>

      <div className="rounded-xl bg-zinc-800/80 border border-zinc-700 p-4 mb-6">
        <p className="text-sm text-zinc-400 uppercase tracking-wider">Prompt</p>
        <p className="text-lg font-medium mt-1">{prompt.text}</p>
        <div className="mt-2">
          <Countdown firedAt={prompt.fired_at} durationSeconds={prompt.duration_seconds} />
        </div>
      </div>

      <div className="space-y-4">
        {preview ? (
          <div className="relative rounded-xl overflow-hidden border border-zinc-700">
            <img src={preview} alt="Preview" className="w-full object-cover max-h-96" />
            <button
              onClick={() => {
                setFile(null);
                setPreview(null);
              }}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-black/80"
            >
              ✕
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 rounded-xl p-12 cursor-pointer hover:border-zinc-500 transition-colors">
            <div className="text-4xl mb-2">📸</div>
            <span className="text-zinc-400 text-sm">Tap to take a photo or choose one</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              className="hidden"
            />
          </label>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!file || submitting}
          className="w-full bg-white text-black font-semibold rounded-lg py-3 text-sm hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "Uploading..." : "Submit Photo"}
        </button>
      </div>
    </main>
  );
}
