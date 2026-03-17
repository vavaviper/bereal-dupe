"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getSessionId } from "@/lib/session";

interface NearbyEvent {
  id: string;
  name: string;
  distance_meters: number;
  visibility?: "public" | "private";
  active_prompt: { text: string } | null;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m away`;
  return `${(meters / 1000).toFixed(1)}km away`;
}

export default function LandingPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"code" | "geo">("code");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nearbyEvents, setNearbyEvents] = useState<NearbyEvent[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedPrivateEvent, setSelectedPrivateEvent] = useState<NearbyEvent | null>(null);
  const [passcode, setPasscode] = useState("");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

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

  async function handleGeoSearch() {
    setLoading(true);
    setError(null);
    setNearbyEvents([]);
    setHasSearched(false);

    if (!navigator.geolocation) {
      setError("Geolocation not supported by your browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        try {
          const events = await apiFetch<NearbyEvent[]>(
            `/api/events/nearby?lat=${coords.lat}&lng=${coords.lng}`
          );
          setNearbyEvents(events);
          setHasSearched(true);
          if (events.length === 0) {
            setError("No events found near your location");
          }
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

  function handleEventClick(ev: NearbyEvent) {
    if (ev.visibility === "private") {
      setSelectedPrivateEvent(ev);
      setPasscode("");
      setError(null);
    } else {
      router.push(`/event/${ev.id}`);
    }
  }

  async function handlePasscodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPrivateEvent || !passcode.trim() || !userCoords) return;
    setLoading(true);
    setError(null);

    try {
      await apiFetch(`/api/events/${selectedPrivateEvent.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: userCoords.lat,
          lng: userCoords.lng,
          passcode: passcode.trim(),
          session_id: getSessionId(),
          display_name: name.trim() || undefined,
        }),
      });
      router.push(`/event/${selectedPrivateEvent.id}`);
    } catch {
      setError("Invalid passcode");
    } finally {
      setLoading(false);
    }
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
            onClick={() => { setMode("code"); setNearbyEvents([]); setHasSearched(false); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === "code" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-zinc-300"
            }`}
          >
            Event Code
          </button>
          <button
            onClick={() => { setMode("geo"); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === "geo" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-zinc-300"
            }`}
          >
            Nearby
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
          <div className="space-y-4">
            <button
              onClick={handleGeoSearch}
              disabled={loading}
              className="w-full bg-white text-black font-semibold rounded-lg py-3 text-sm hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Searching..." : hasSearched ? "Refresh" : "Find Nearby Events"}
            </button>

            {nearbyEvents.length > 0 && !selectedPrivateEvent && (
              <div className="space-y-2">
                {nearbyEvents.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => handleEventClick(ev)}
                    className="w-full text-left bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 hover:border-zinc-500 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        {ev.visibility === "private" && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-zinc-400 shrink-0">
                            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span className="font-medium text-sm truncate">{ev.name}</span>
                      </div>
                      <span className="text-xs text-zinc-400 ml-2 shrink-0">
                        {formatDistance(ev.distance_meters)}
                      </span>
                    </div>
                    {ev.active_prompt && (
                      <p className="text-xs text-zinc-500 mt-1 truncate">
                        {ev.active_prompt.text}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {selectedPrivateEvent && (
              <form onSubmit={handlePasscodeSubmit} className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <button
                    type="button"
                    onClick={() => { setSelectedPrivateEvent(null); setError(null); }}
                    className="text-zinc-400 hover:text-white transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <span className="text-sm font-medium">{selectedPrivateEvent.name}</span>
                </div>
                <input
                  type="text"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter event passcode"
                  autoFocus
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-center text-xl tracking-[0.3em] font-mono placeholder:tracking-normal placeholder:text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                />
                <button
                  type="submit"
                  disabled={loading || !passcode.trim()}
                  className="w-full bg-white text-black font-semibold rounded-lg py-3 text-sm hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? "Verifying..." : "Join Event"}
                </button>
              </form>
            )}
          </div>
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
