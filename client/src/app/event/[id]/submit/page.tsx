"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, API_BASE } from "@/lib/api";
import { getSessionId } from "@/lib/session";
import type { Event, Prompt, Submission } from "@/lib/types";
import Countdown from "@/components/Countdown";
import DualCamera from "@/components/DualCamera";

export default function SubmitPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [eventName, setEventName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [cameraOpen, setCameraOpen] = useState(false);

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

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
  }

  function handleCameraCapture(mergedFile: File, previewUrl: string) {
    setFile(mergedFile);
    setPreview(previewUrl);
    setCameraOpen(false);
    setResult(null);
  }

  function clearPhoto() {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  }

  async function handleSubmit() {
    if (!file || !prompt) return;
    setSubmitting(true);
    setError(null);

    const form = new FormData();
    form.append("image", file);
    form.append("user_session_id", getSessionId());

    try {
      const res = await fetch(`${API_BASE}/api/events/${id}/submit`, {
        method: "POST",
        body: form,
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || `Upload failed (${res.status})`);
      }
      setResult(body as Submission);
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

  if (cameraOpen) {
    return (
      <DualCamera
        onCapture={handleCameraCapture}
        onCancel={() => setCameraOpen(false)}
      />
    );
  }

  if (result) {
    return (
      <main className="max-w-md mx-auto px-4 py-8">
        <div className={`rounded-xl border p-6 text-center ${
          result.validated
            ? "bg-green-900/20 border-green-700/50"
            : "bg-yellow-900/20 border-yellow-700/50"
        }`}>
          <div className="text-4xl mb-3">{result.validated ? "✅" : "⚠️"}</div>
          <h2 className="text-lg font-semibold mb-1">
            {result.validated ? "Photo Verified!" : "Photo Submitted (Unverified)"}
          </h2>
          <p className="text-sm text-zinc-400 mb-1">
            {result.validated
              ? "Your submission matches the prompt."
              : "Your photo was submitted but couldn't be verified against the prompt."}
          </p>
          <p className="text-xs text-zinc-500 mb-4">
            Confidence: {Math.round((result.confidence ?? 0) * 100)}%
          </p>
          <button
            onClick={() => router.push(`/event/${id}`)}
            className="bg-white text-black font-semibold rounded-lg px-6 py-2.5 text-sm hover:bg-zinc-200 transition-colors"
          >
            Back to Canvas
          </button>
        </div>
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
              onClick={clearPhoto}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-black/80"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Primary: BeReal-style dual camera */}
            <button
              onClick={() => setCameraOpen(true)}
              className="w-full flex flex-col items-center justify-center border-2 border-dashed border-zinc-600 rounded-xl p-10 cursor-pointer hover:border-zinc-400 transition-colors bg-zinc-800/40"
            >
              <div className="relative mb-3">
                <div className="text-5xl">📸</div>
                <div className="absolute -top-1 -right-3 text-lg">🤳</div>
              </div>
              <span className="text-white font-medium text-sm">Take a Candid</span>
              <span className="text-zinc-500 text-xs mt-1">Front + back camera, BeReal style</span>
            </button>

            {/* Secondary: regular file upload fallback */}
            <label className="flex items-center justify-center gap-2 text-zinc-500 text-xs cursor-pointer hover:text-zinc-300 transition-colors py-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" />
                <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
              </svg>
              Or upload a photo from gallery
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
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
          {submitting ? "Verifying..." : "Submit Photo"}
        </button>
      </div>
    </main>
  );
}
