"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { Event, Prompt } from "@/lib/types";

export default function OrganizerPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await apiFetch<Event[]>("/organizer/events");
    setEvents(data);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Organizer Dashboard</h1>

      <CreateEventForm onCreated={refresh} />

      <h2 className="text-lg font-semibold mt-10 mb-4">Events</h2>
      {events.length === 0 && (
        <p className="text-zinc-500">No events yet. Create one above.</p>
      )}

      <div className="space-y-3">
        {events.map((ev) => (
          <EventCard
            key={ev.id}
            event={ev}
            expanded={expandedEvent === ev.id}
            onToggle={() =>
              setExpandedEvent(expandedEvent === ev.id ? null : ev.id)
            }
            onUpdate={refresh}
          />
        ))}
      </div>
    </main>
  );
}

function CreateEventForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [accessType, setAccessType] = useState<"code" | "geo">("code");
  const [codeValue, setCodeValue] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("100");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const access_value =
        accessType === "code"
          ? codeValue
          : { lat: Number(lat), lng: Number(lng), radius_meters: Number(radius) };

      await apiFetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, access_type: accessType, access_value }),
      });
      setName("");
      setCodeValue("");
      setLat("");
      setLng("");
      onCreated();
    } catch {
      alert("Failed to create event");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl bg-zinc-800/80 border border-zinc-700 p-5 space-y-4"
    >
      <h2 className="text-lg font-semibold">Create Event</h2>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Event name"
        required
        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setAccessType("code")}
          className={`flex-1 py-2 text-sm rounded-lg border ${
            accessType === "code"
              ? "border-zinc-500 bg-zinc-700 text-white"
              : "border-zinc-700 text-zinc-400"
          }`}
        >
          Entry Code
        </button>
        <button
          type="button"
          onClick={() => setAccessType("geo")}
          className={`flex-1 py-2 text-sm rounded-lg border ${
            accessType === "geo"
              ? "border-zinc-500 bg-zinc-700 text-white"
              : "border-zinc-700 text-zinc-400"
          }`}
        >
          Geolocation
        </button>
      </div>

      {accessType === "code" ? (
        <input
          type="text"
          value={codeValue}
          onChange={(e) => setCodeValue(e.target.value)}
          placeholder="4-6 digit alphanumeric code"
          maxLength={6}
          required
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-zinc-500"
        />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <input
            type="number"
            step="any"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="Latitude"
            required
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
          <input
            type="number"
            step="any"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="Longitude"
            required
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
          <input
            type="number"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            placeholder="Radius (m)"
            required
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-white text-black font-semibold rounded-lg py-2.5 text-sm hover:bg-zinc-200 transition-colors disabled:opacity-40"
      >
        {loading ? "Creating..." : "Create Event"}
      </button>
    </form>
  );
}

function EventCard({
  event,
  expanded,
  onToggle,
  onUpdate,
}: {
  event: Event;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: () => void;
}) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [promptText, setPromptText] = useState("");
  const [duration, setDuration] = useState("120");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const fetchPrompts = useCallback(async () => {
    try {
      const ev = await apiFetch<Event & { active_prompt: Prompt | null }>(
        `/api/events/${event.id}`
      );
      const allPrompts = await apiFetch<Prompt[]>(
        `/organizer/events/${event.id}/prompts`
      ).catch(() => [] as Prompt[]);
      setPrompts(allPrompts.length ? allPrompts : ev.active_prompt ? [ev.active_prompt] : []);
    } catch {
      /* ignore */
    }
  }, [event.id]);

  useEffect(() => {
    if (expanded) fetchPrompts();
  }, [expanded, fetchPrompts]);

  async function addPrompt(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch(`/organizer/events/${event.id}/prompts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: promptText, duration_seconds: Number(duration) }),
    });
    setPromptText("");
    fetchPrompts();
  }

  async function firePrompt(pid: string) {
    setLoadingAction(pid);
    await apiFetch(`/organizer/events/${event.id}/prompts/${pid}/fire`, {
      method: "POST",
    });
    setLoadingAction(null);
    fetchPrompts();
    onUpdate();
  }

  async function endPrompt(pid: string) {
    setLoadingAction(pid);
    await apiFetch(`/organizer/events/${event.id}/prompts/${pid}/end`, {
      method: "POST",
    });
    setLoadingAction(null);
    fetchPrompts();
    onUpdate();
  }

  const accessDisplay =
    event.access_type === "code"
      ? `Code: ${event.access_value}`
      : `Geo: ${(event.access_value as { lat: number; lng: number; radius_meters: number }).lat}, ${(event.access_value as { lat: number; lng: number; radius_meters: number }).lng}`;

  return (
    <div className="rounded-xl bg-zinc-800/60 border border-zinc-700/50 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-zinc-800/80 transition-colors"
      >
        <div>
          <span className="font-medium">{event.name}</span>
          <span className="ml-3 text-xs text-zinc-500">{accessDisplay}</span>
        </div>
        <span className="text-zinc-500 text-sm">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-zinc-700/50 px-5 py-4 space-y-4">
          <p className="text-xs text-zinc-500 font-mono break-all">ID: {event.id}</p>

          <form onSubmit={addPrompt} className="flex gap-2">
            <input
              type="text"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Prompt text..."
              required
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-20 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
              placeholder="sec"
            />
            <button
              type="submit"
              className="bg-zinc-700 text-white rounded-lg px-4 py-2 text-sm hover:bg-zinc-600 transition-colors"
            >
              Add
            </button>
          </form>

          {prompts.length === 0 && (
            <p className="text-sm text-zinc-500">No prompts yet.</p>
          )}

          <div className="space-y-2">
            {prompts.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm ${
                  p.active
                    ? "bg-green-900/30 border border-green-700/50"
                    : "bg-zinc-900/50 border border-zinc-700/30"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{p.text}</span>
                  <span className="text-zinc-500 ml-2 text-xs">{p.duration_seconds}s</span>
                  {p.active && (
                    <span className="ml-2 text-xs text-green-400 font-medium">LIVE</span>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {!p.active ? (
                    <button
                      onClick={() => firePrompt(p.id)}
                      disabled={loadingAction === p.id}
                      className="bg-green-700 text-white rounded-md px-3 py-1.5 text-xs font-medium hover:bg-green-600 disabled:opacity-40"
                    >
                      Fire
                    </button>
                  ) : (
                    <button
                      onClick={() => endPrompt(p.id)}
                      disabled={loadingAction === p.id}
                      className="bg-red-700 text-white rounded-md px-3 py-1.5 text-xs font-medium hover:bg-red-600 disabled:opacity-40"
                    >
                      End
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
