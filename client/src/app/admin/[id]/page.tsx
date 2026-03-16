"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { apiFetch, API_BASE } from "@/lib/api";
import {
  setAdminPassword,
  getAdminPassword,
  clearAdminPassword,
  adminFetch,
} from "@/lib/admin";
import type { Event, Prompt, Submission, Participant } from "@/lib/types";
import Countdown from "@/components/Countdown";

type Tab = "overview" | "members" | "prompts" | "submissions";

export default function AdminPage() {
  const { id } = useParams<{ id: string }>();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const saved = getAdminPassword(id);
    if (saved) {
      fetch(`${API_BASE}/api/events/${id}/admin/dashboard`, {
        headers: { "x-admin-password": saved },
      })
        .then((res) => {
          if (res.ok) setAuthenticated(true);
          else clearAdminPassword(id);
        })
        .catch(() => clearAdminPassword(id))
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, [id]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      await apiFetch(`/api/events/${id}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      setAdminPassword(id, password);
      setAuthenticated(true);
    } catch {
      setLoginError("Invalid password");
    } finally {
      setLoginLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Admin Login</h1>
            <p className="text-zinc-400 mt-2">Enter your event admin password</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              autoFocus
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
            <button
              type="submit"
              disabled={loginLoading || !password}
              className="w-full bg-white text-black font-semibold rounded-lg py-3 text-sm hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loginLoading ? "Verifying..." : "Sign In"}
            </button>
          </form>

          {loginError && (
            <div className="mt-4 bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm text-center">
              {loginError}
            </div>
          )}
        </div>
      </main>
    );
  }

  return <AdminDashboard eventId={id} />;
}

function AdminDashboard({ eventId }: { eventId: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [event, setEvent] = useState<Event | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [members, setMembers] = useState<Participant[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await adminFetch<{
        event: Event;
        prompts: Prompt[];
        members: Participant[];
        submissions: Submission[];
      }>(eventId, `/api/events/${eventId}/admin/dashboard`);
      setEvent(data.event);
      setPrompts(data.prompts);
      setMembers(data.members);
      setSubmissions(data.submissions);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10_000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (loading || !event) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-zinc-400">Loading dashboard...</div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "members", label: "Members", count: members.length },
    { key: "prompts", label: "Prompts", count: prompts.length },
    { key: "submissions", label: "Submissions", count: submissions.length },
  ];

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
          <p className="text-sm text-zinc-500 mt-1">Admin Dashboard</p>
        </div>
        <button
          onClick={() => {
            clearAdminPassword(eventId);
            window.location.reload();
          }}
          className="text-sm text-zinc-500 hover:text-zinc-300"
        >
          Sign out
        </button>
      </header>

      <div className="flex gap-1 rounded-lg bg-zinc-800 p-1 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === t.key
                ? "bg-zinc-700 text-white"
                : "text-zinc-400 hover:text-zinc-300"
            }`}
          >
            {t.label}
            {t.count != null && (
              <span className="ml-1.5 text-xs text-zinc-500">({t.count})</span>
            )}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <OverviewTab event={event} prompts={prompts} members={members} submissions={submissions} onUpdate={refresh} eventId={eventId} />
      )}
      {tab === "members" && (
        <MembersTab members={members} eventId={eventId} onUpdate={refresh} />
      )}
      {tab === "prompts" && (
        <PromptsTab prompts={prompts} eventId={eventId} event={event} onUpdate={refresh} />
      )}
      {tab === "submissions" && (
        <SubmissionsTab prompts={prompts} submissions={submissions} />
      )}
    </main>
  );
}

// ── Overview Tab ──────────────────────────────────────────────

function OverviewTab({
  event,
  prompts,
  members,
  submissions,
  onUpdate,
  eventId,
}: {
  event: Event;
  prompts: Prompt[];
  members: Participant[];
  submissions: Submission[];
  onUpdate: () => void;
  eventId: string;
}) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(event.name);
  const [interval, setInterval] = useState(String(event.prompt_interval_minutes));
  const [saving, setSaving] = useState(false);

  async function saveName() {
    setSaving(true);
    await adminFetch(eventId, `/api/events/${eventId}/admin/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setEditingName(false);
    setSaving(false);
    onUpdate();
  }

  async function saveInterval() {
    setSaving(true);
    await adminFetch(eventId, `/api/events/${eventId}/admin/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt_interval_minutes: Number(interval) }),
    });
    setSaving(false);
    onUpdate();
  }

  const accessDisplay =
    event.access_type === "code"
      ? event.access_value as string
      : `${(event.access_value as { lat: number; lng: number }).lat}, ${(event.access_value as { lat: number; lng: number }).lng}`;

  const activePrompt = prompts.find((p) => p.active);
  const lastFired = prompts
    .filter((p) => p.fired_at)
    .sort((a, b) => new Date(b.fired_at!).getTime() - new Date(a.fired_at!).getTime())[0];

  let nextPromptIn: string | null = null;
  if (lastFired && event.prompt_interval_minutes) {
    const elapsed =
      (Date.now() - new Date(lastFired.fired_at!).getTime()) / 1000 / 60;
    const remaining = event.prompt_interval_minutes - elapsed;
    if (remaining > 0) {
      nextPromptIn = `${Math.ceil(remaining)} min`;
    } else {
      nextPromptIn = "now";
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-zinc-800/80 border border-zinc-700 p-4 text-center">
          <p className="text-2xl font-bold">{members.length}</p>
          <p className="text-xs text-zinc-500 mt-1">Members</p>
        </div>
        <div className="rounded-xl bg-zinc-800/80 border border-zinc-700 p-4 text-center">
          <p className="text-2xl font-bold">{prompts.length}</p>
          <p className="text-xs text-zinc-500 mt-1">Prompts</p>
        </div>
        <div className="rounded-xl bg-zinc-800/80 border border-zinc-700 p-4 text-center">
          <p className="text-2xl font-bold">{submissions.length}</p>
          <p className="text-xs text-zinc-500 mt-1">Submissions</p>
        </div>
      </div>

      {/* Active Prompt */}
      {activePrompt && activePrompt.fired_at && (
        <div className="rounded-xl bg-green-900/20 border border-green-700/50 p-4">
          <p className="text-xs text-green-400 uppercase tracking-wider font-medium mb-1">
            Live Prompt
          </p>
          <p className="text-lg font-medium">{activePrompt.text}</p>
          <div className="mt-2">
            <Countdown
              firedAt={activePrompt.fired_at}
              durationSeconds={activePrompt.duration_seconds}
            />
          </div>
        </div>
      )}

      {/* Event Details */}
      <div className="rounded-xl bg-zinc-800/80 border border-zinc-700 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Event Details
        </h3>

        {/* Name */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Name</span>
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
              <button
                onClick={saveName}
                disabled={saving}
                className="text-sm text-green-400 hover:text-green-300"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditingName(false);
                  setName(event.name);
                }}
                className="text-sm text-zinc-500 hover:text-zinc-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm">{event.name}</span>
              <button
                onClick={() => setEditingName(true)}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Access */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">
            {event.access_type === "code" ? "Entry Code" : "Geolocation"}
          </span>
          <span className="text-sm font-mono">{accessDisplay}</span>
        </div>

        {/* Event ID */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Event ID</span>
          <span className="text-xs font-mono text-zinc-500 break-all">{event.id}</span>
        </div>

        {/* Created */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Created</span>
          <span className="text-sm text-zinc-500">
            {new Date(event.created_at).toLocaleDateString()}
          </span>
        </div>

        {/* Attendee Link */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Attendee Link</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}/event/${event.id}`
              );
            }}
            className="text-sm text-zinc-400 hover:text-white underline"
          >
            Copy Link
          </button>
        </div>
      </div>

      {/* Prompt Interval */}
      <div className="rounded-xl bg-zinc-800/80 border border-zinc-700 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Prompt Timing
        </h3>

        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400">Interval between prompts</span>
          <input
            type="number"
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            min="1"
            className="w-20 bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
          <span className="text-sm text-zinc-500">min</span>
          {Number(interval) !== event.prompt_interval_minutes && (
            <button
              onClick={saveInterval}
              disabled={saving}
              className="text-sm text-green-400 hover:text-green-300"
            >
              Save
            </button>
          )}
        </div>

        {nextPromptIn && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Next prompt suggested in</span>
            <span
              className={`text-sm font-medium ${
                nextPromptIn === "now" ? "text-green-400" : "text-yellow-400"
              }`}
            >
              {nextPromptIn}
            </span>
          </div>
        )}

        {lastFired && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Last fired</span>
            <span className="text-sm text-zinc-500">
              {new Date(lastFired.fired_at!).toLocaleTimeString()} — &quot;{lastFired.text}&quot;
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Members Tab ───────────────────────────────────────────────

function MembersTab({
  members,
  eventId,
  onUpdate,
}: {
  members: Participant[];
  eventId: string;
  onUpdate: () => void;
}) {
  async function removeMember(mid: string) {
    if (!confirm("Remove this member?")) return;
    await adminFetch(eventId, `/api/events/${eventId}/admin/members/${mid}`, {
      method: "DELETE",
    });
    onUpdate();
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500">No members have joined yet.</p>
        <p className="text-xs text-zinc-600 mt-2">
          Members appear here when they verify the event code or location.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-4 py-2 text-xs text-zinc-500 uppercase tracking-wider">
        <span className="flex-1">Name</span>
        <span className="w-24 text-center">Submissions</span>
        <span className="w-36 text-center">Joined</span>
        <span className="w-20 text-right">Actions</span>
      </div>
      {members.map((m, i) => (
        <div
          key={m.id}
          className="flex items-center justify-between rounded-lg bg-zinc-800/60 border border-zinc-700/50 px-4 py-3"
        >
          <span className="flex-1 text-sm">
            {m.display_name || `Guest ${i + 1}`}
            <span className="ml-2 text-xs text-zinc-600 font-mono">
              {m.session_id.slice(0, 8)}
            </span>
          </span>
          <span className="w-24 text-center text-sm text-zinc-400">
            {m.submission_count ?? 0}
          </span>
          <span className="w-36 text-center text-xs text-zinc-500">
            {new Date(m.joined_at).toLocaleString()}
          </span>
          <span className="w-20 text-right">
            <button
              onClick={() => removeMember(m.id)}
              className="text-xs text-red-500 hover:text-red-400"
            >
              Remove
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Prompts Tab ───────────────────────────────────────────────

function PromptsTab({
  prompts,
  eventId,
  event,
  onUpdate,
}: {
  prompts: Prompt[];
  eventId: string;
  event: Event;
  onUpdate: () => void;
}) {
  const [text, setText] = useState("");
  const [duration, setDuration] = useState("120");
  const [adding, setAdding] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function addPrompt(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    await apiFetch(`/organizer/events/${eventId}/prompts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, duration_seconds: Number(duration) }),
    });
    setText("");
    setAdding(false);
    onUpdate();
  }

  async function firePrompt(pid: string) {
    setActionLoading(pid);
    await apiFetch(`/organizer/events/${eventId}/prompts/${pid}/fire`, {
      method: "POST",
    });
    setActionLoading(null);
    onUpdate();
  }

  async function endPrompt(pid: string) {
    setActionLoading(pid);
    await apiFetch(`/organizer/events/${eventId}/prompts/${pid}/end`, {
      method: "POST",
    });
    setActionLoading(null);
    onUpdate();
  }

  async function deletePrompt(pid: string) {
    if (!confirm("Delete this prompt? This cannot be undone.")) return;
    setActionLoading(pid);
    await adminFetch(eventId, `/api/events/${eventId}/admin/prompts/${pid}`, {
      method: "DELETE",
    });
    setActionLoading(null);
    onUpdate();
  }

  // Sort: active first, then by creation
  const sorted = [...prompts].sort((a, b) => {
    if (a.active && !b.active) return -1;
    if (!a.active && b.active) return 1;
    return 0;
  });

  return (
    <div className="space-y-6">
      <form
        onSubmit={addPrompt}
        className="rounded-xl bg-zinc-800/80 border border-zinc-700 p-4"
      >
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Add Prompt
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What should attendees photograph?"
            required
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            min="10"
            className="w-24 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
            placeholder="sec"
          />
          <button
            type="submit"
            disabled={adding}
            className="bg-white text-black font-semibold rounded-lg px-5 py-2.5 text-sm hover:bg-zinc-200 transition-colors disabled:opacity-40"
          >
            {adding ? "..." : "Add"}
          </button>
        </div>
        <p className="text-xs text-zinc-600 mt-2">
          Duration in seconds. Interval between prompts: {event.prompt_interval_minutes} min
        </p>
      </form>

      {sorted.length === 0 && (
        <p className="text-center text-zinc-500 py-8">
          No prompts created yet. Add one above.
        </p>
      )}

      <div className="space-y-2">
        {sorted.map((p) => (
          <div
            key={p.id}
            className={`rounded-lg px-4 py-3 flex items-center justify-between gap-3 ${
              p.active
                ? "bg-green-900/20 border border-green-700/50"
                : "bg-zinc-800/60 border border-zinc-700/50"
            }`}
          >
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium">{p.text}</span>
              <span className="text-xs text-zinc-500 ml-2">
                {p.duration_seconds}s
              </span>
              {p.active && (
                <span className="ml-2 text-xs text-green-400 font-medium">
                  LIVE
                </span>
              )}
              {p.active && p.fired_at && (
                <span className="ml-2">
                  <Countdown
                    firedAt={p.fired_at}
                    durationSeconds={p.duration_seconds}
                  />
                </span>
              )}
              {p.fired_at && !p.active && (
                <span className="ml-2 text-xs text-zinc-600">
                  Fired {new Date(p.fired_at).toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              {!p.active ? (
                <button
                  onClick={() => firePrompt(p.id)}
                  disabled={actionLoading === p.id}
                  className="bg-green-700 text-white rounded-md px-3 py-1.5 text-xs font-medium hover:bg-green-600 disabled:opacity-40"
                >
                  Fire
                </button>
              ) : (
                <button
                  onClick={() => endPrompt(p.id)}
                  disabled={actionLoading === p.id}
                  className="bg-red-700 text-white rounded-md px-3 py-1.5 text-xs font-medium hover:bg-red-600 disabled:opacity-40"
                >
                  End
                </button>
              )}
              <button
                onClick={() => deletePrompt(p.id)}
                disabled={actionLoading === p.id}
                className="text-xs text-zinc-600 hover:text-red-400 px-2 py-1.5"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Submissions Tab ───────────────────────────────────────────

function SubmissionsTab({
  prompts,
  submissions,
}: {
  prompts: Prompt[];
  submissions: Submission[];
}) {
  const [selectedPrompt, setSelectedPrompt] = useState<string | "all">("all");

  const filtered =
    selectedPrompt === "all"
      ? submissions
      : submissions.filter((s) => s.prompt_id === selectedPrompt);

  const promptMap = new Map(prompts.map((p) => [p.id, p]));

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-zinc-400">Filter by prompt:</span>
        <button
          onClick={() => setSelectedPrompt("all")}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            selectedPrompt === "all"
              ? "border-zinc-500 bg-zinc-700 text-white"
              : "border-zinc-700 text-zinc-400 hover:text-zinc-300"
          }`}
        >
          All ({submissions.length})
        </button>
        {prompts.map((p) => {
          const count = submissions.filter(
            (s) => s.prompt_id === p.id
          ).length;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedPrompt(p.id)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors truncate max-w-48 ${
                selectedPrompt === p.id
                  ? "border-zinc-500 bg-zinc-700 text-white"
                  : "border-zinc-700 text-zinc-400 hover:text-zinc-300"
              }`}
            >
              {p.text} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-zinc-500 py-8">No submissions yet.</p>
      )}

      {/* Gallery */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
        {filtered.map((sub) => {
          const prompt = promptMap.get(sub.prompt_id);
          return (
            <div
              key={sub.id}
              className="break-inside-avoid rounded-xl overflow-hidden bg-zinc-800/50 border border-zinc-700/50"
            >
              <img
                src={`${API_BASE}${sub.image_url}`}
                alt="Submission"
                className="w-full object-cover"
                loading="lazy"
              />
              <div className="px-3 py-2 space-y-0.5">
                {prompt && (
                  <p className="text-xs text-zinc-500 truncate">
                    {prompt.text}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-600">
                    {new Date(sub.submitted_at).toLocaleString()}
                  </span>
                  <span
                    className={`text-xs ${
                      sub.validated ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {sub.validated ? "Valid" : "Rejected"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
