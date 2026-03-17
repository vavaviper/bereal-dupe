"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getSessionId } from "@/lib/session";

export default function LandingPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"code" | "geo">("code");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const events = await apiFetch<
        { id: string; access_type: string; access_value: string }[]
      >("/organizer/events");

      const needle = code.trim().toUpperCase();
      const match = events.find(
        (ev) =>
          ev.access_type === "code" &&
          String(ev.access_value).toUpperCase() === needle
      );
      if (!match) {
        setError("Invalid event code");
        return;
      }

      await apiFetch(`/api/events/${match.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: String(match.access_value),
          session_id: getSessionId(),
          display_name: name.trim() || undefined,
        }),
      });

      router.push(`/event/${match.id}`);
    } catch {
      setError("Invalid event code");
    } finally {
      setLoading(false);
    }
  }

  async function handleGeoJoin() {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation not supported by your browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const events = await apiFetch<
            {
              id: string;
              access_type: string;
              access_value: { lat: number; lng: number; radius_meters: number };
            }[]
          >("/organizer/events");

          const geoEvents = events.filter((ev) => ev.access_type === "geo");

          for (const ev of geoEvents) {
            try {
              await apiFetch(`/api/events/${ev.id}/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                  session_id: getSessionId(),
                  display_name: name.trim() || undefined,
                }),
              });
              router.push(`/event/${ev.id}`);
              return;
            } catch {
              continue;
            }
          }

          setError("No events found near your location");
        } catch {
          setError("Failed to find events");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Location access denied");
        setLoading(false);
      }
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Candid</h1>
          <p className="text-zinc-400 mt-2">Join a live photo event</p>
        </div>

        <div className="flex rounded-lg bg-zinc-800 p-1 mb-6">
          <button
            onClick={() => setMode("code")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === "code" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-zinc-300"
            }`}
          >
            Event Code
          </button>
          <button
            onClick={() => setMode("geo")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === "geo" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-zinc-300"
            }`}
          >
            My Location
          </button>
        </div>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 mb-4"
        />

        {mode === "code" ? (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter 4-6 digit code"
              maxLength={6}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-center text-xl tracking-[0.3em] font-mono placeholder:tracking-normal placeholder:text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full bg-white text-black font-semibold rounded-lg py-3 text-sm hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Joining..." : "Join Event"}
            </button>
          </form>
        ) : (
          <button
            onClick={handleGeoJoin}
            disabled={loading}
            className="w-full bg-white text-black font-semibold rounded-lg py-3 text-sm hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Finding events..." : "Find Nearby Event"}
          </button>
        )}

        {error && (
          <div className="mt-4 bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm text-center">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
