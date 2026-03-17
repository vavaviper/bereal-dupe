const { db } = require("../firebase");

// ── Events ────────────────────────────────────────────────────

async function getEvents() {
  const snap = await db.ref("events").once("value");
  return snap.val() ? Object.values(snap.val()) : [];
}

async function getEvent(id) {
  const snap = await db.ref(`events/${id}`).once("value");
  return snap.val() || null;
}

async function createEvent(event) {
  await db.ref(`events/${event.id}`).set(event);
  return event;
}

async function updateEvent(id, updates) {
  const snap = await db.ref(`events/${id}`).once("value");
  if (!snap.exists()) return null;
  await db.ref(`events/${id}`).update(updates);
  const updated = await db.ref(`events/${id}`).once("value");
  return updated.val();
}

// ── Prompts ───────────────────────────────────────────────────

async function getPromptsByEvent(eventId) {
  const snap = await db
    .ref("prompts")
    .orderByChild("event_id")
    .equalTo(eventId)
    .once("value");
  return snap.val() ? Object.values(snap.val()) : [];
}

async function getPrompt(id) {
  const snap = await db.ref(`prompts/${id}`).once("value");
  return snap.val() || null;
}

async function createPrompt(prompt) {
  await db.ref(`prompts/${prompt.id}`).set(prompt);
  return prompt;
}

async function updatePrompt(id, updates) {
  const snap = await db.ref(`prompts/${id}`).once("value");
  if (!snap.exists()) return null;
  await db.ref(`prompts/${id}`).update(updates);
  const updated = await db.ref(`prompts/${id}`).once("value");
  return updated.val();
}

async function deletePrompt(id) {
  const snap = await db.ref(`prompts/${id}`).once("value");
  if (!snap.exists()) return false;
  await db.ref(`prompts/${id}`).remove();
  return true;
}

async function getActivePrompt(eventId) {
  const prompts = await getPromptsByEvent(eventId);
  return prompts.find((p) => p.active) || null;
}

// ── Submissions ───────────────────────────────────────────────

async function getSubmissionsByPrompt(promptId) {
  const snap = await db
    .ref("submissions")
    .orderByChild("prompt_id")
    .equalTo(promptId)
    .once("value");
  return snap.val() ? Object.values(snap.val()) : [];
}

async function getSubmissionBySession(promptId, sessionId) {
  const subs = await getSubmissionsByPrompt(promptId);
  return subs.find((s) => s.user_session_id === sessionId) || null;
}

async function getAllSubmissions() {
  const snap = await db.ref("submissions").once("value");
  return snap.val() ? Object.values(snap.val()) : [];
}

async function createSubmission(submission) {
  await db.ref(`submissions/${submission.id}`).set(submission);
  return submission;
}

async function getSubmissionsByEvent(eventId) {
  const prompts = await getPromptsByEvent(eventId);
  const promptIds = new Set(prompts.map((p) => p.id));
  if (promptIds.size === 0) return [];

  const results = [];
  for (const pid of promptIds) {
    const subs = await getSubmissionsByPrompt(pid);
    results.push(...subs);
  }
  return results;
}

// ── Participants ──────────────────────────────────────────────

async function getParticipantsByEvent(eventId) {
  const snap = await db
    .ref("participants")
    .orderByChild("event_id")
    .equalTo(eventId)
    .once("value");
  return snap.val() ? Object.values(snap.val()) : [];
}

async function createParticipant(participant) {
  await db.ref(`participants/${participant.id}`).set(participant);
  return participant;
}

async function getParticipantBySession(eventId, sessionId) {
  const participants = await getParticipantsByEvent(eventId);
  return participants.find((p) => p.session_id === sessionId) || null;
}

async function deleteParticipant(id) {
  const snap = await db.ref(`participants/${id}`).once("value");
  if (!snap.exists()) return false;
  await db.ref(`participants/${id}`).remove();
  return true;
}

// ── Leaderboard ───────────────────────────────────────────────

async function getLeaderboard() {
  const submissions = await getAllSubmissions();

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
      username: "Anonymous",
      score: entry.validated,
    }))
    .sort((a, b) => b.score - a.score);
}

module.exports = {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  getPromptsByEvent,
  getPrompt,
  createPrompt,
  updatePrompt,
  getActivePrompt,
  deletePrompt,
  getSubmissionsByPrompt,
  getSubmissionBySession,
  getAllSubmissions,
  getSubmissionsByEvent,
  createSubmission,
  getParticipantsByEvent,
  createParticipant,
  getParticipantBySession,
  deleteParticipant,
  getLeaderboard,
};
