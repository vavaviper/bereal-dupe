const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "db.json");

const empty = () => ({ events: {}, prompts: {}, submissions: {}, users: {} });

function load() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    if (!data.users) data.users = {};
    return data;
  } catch {
    return empty();
  }
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getAll() {
  return load();
}

// ── Events ─────────────────────────────────────────────────────

function getEvents() {
  return Object.values(load().events);
}

function getEvent(id) {
  return load().events[id] ?? null;
}

function createEvent(event) {
  const data = load();
  data.events[event.id] = event;
  save(data);
  return event;
}

function getGeoEvents() {
  return Object.values(load().events).filter((e) => e.access_type === "geo");
}

// ── Prompts ────────────────────────────────────────────────────

function getPromptsByEvent(eventId) {
  const data = load();
  return Object.values(data.prompts).filter((p) => p.event_id === eventId);
}

function getPrompt(id) {
  return load().prompts[id] ?? null;
}

function createPrompt(prompt) {
  const data = load();
  data.prompts[prompt.id] = prompt;
  save(data);
  return prompt;
}

function updatePrompt(id, updates) {
  const data = load();
  if (!data.prompts[id]) return null;
  Object.assign(data.prompts[id], updates);
  save(data);
  return data.prompts[id];
}

function getActivePrompt(eventId) {
  const data = load();
  return (
    Object.values(data.prompts).find(
      (p) => p.event_id === eventId && p.active
    ) ?? null
  );
}

// ── Submissions ────────────────────────────────────────────────

function getSubmissionsByPrompt(promptId) {
  const data = load();
  return Object.values(data.submissions).filter(
    (s) => s.prompt_id === promptId
  );
}

function getSubmissionBySession(promptId, sessionId) {
  const data = load();
  return (
    Object.values(data.submissions).find(
      (s) => s.prompt_id === promptId && s.user_session_id === sessionId
    ) ?? null
  );
}

function getAllSubmissions() {
  return Object.values(load().submissions);
}

function createSubmission(submission) {
  const data = load();
  data.submissions[submission.id] = submission;
  save(data);
  return submission;
}

// ── Leaderboard ────────────────────────────────────────────────

function getLeaderboard() {
  const data = load();
  const submissions = Object.values(data.submissions);
  const users = data.users || {};

  const scores = {};
  for (const sub of submissions) {
    const sid = sub.user_session_id;
    if (!scores[sid]) {
      scores[sid] = { session_id: sid, validated: 0, total: 0 };
    }
    scores[sid].total++;
    if (sub.validated) scores[sid].validated++;
  }

  return Object.values(scores)
    .map((entry) => ({
      ...entry,
      username: users[entry.session_id]?.username || "Anonymous",
      score: entry.validated,
    }))
    .sort((a, b) => b.score - a.score || a.username.localeCompare(b.username));
}

module.exports = {
  getAll,
  getEvents,
  getEvent,
  createEvent,
  getGeoEvents,
  getPromptsByEvent,
  getPrompt,
  createPrompt,
  updatePrompt,
  getActivePrompt,
  getSubmissionsByPrompt,
  getSubmissionBySession,
  getAllSubmissions,
  createSubmission,
  getLeaderboard,
};
