const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "db.json");

const empty = () => ({ events: {}, prompts: {}, submissions: {}, participants: {} });

function load() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
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

function createSubmission(submission) {
  const data = load();
  data.submissions[submission.id] = submission;
  save(data);
  return submission;
}

function updateEvent(id, updates) {
  const data = load();
  if (!data.events[id]) return null;
  Object.assign(data.events[id], updates);
  save(data);
  return data.events[id];
}

function deletePrompt(id) {
  const data = load();
  if (!data.prompts[id]) return false;
  delete data.prompts[id];
  save(data);
  return true;
}

function getParticipantsByEvent(eventId) {
  const data = load();
  if (!data.participants) return [];
  return Object.values(data.participants).filter((p) => p.event_id === eventId);
}

function createParticipant(participant) {
  const data = load();
  if (!data.participants) data.participants = {};
  data.participants[participant.id] = participant;
  save(data);
  return participant;
}

function getParticipantBySession(eventId, sessionId) {
  const data = load();
  if (!data.participants) return null;
  return (
    Object.values(data.participants).find(
      (p) => p.event_id === eventId && p.session_id === sessionId
    ) ?? null
  );
}

function deleteParticipant(id) {
  const data = load();
  if (!data.participants || !data.participants[id]) return false;
  delete data.participants[id];
  save(data);
  return true;
}

function getSubmissionsByEvent(eventId) {
  const data = load();
  const promptIds = new Set(
    Object.values(data.prompts)
      .filter((p) => p.event_id === eventId)
      .map((p) => p.id)
  );
  return Object.values(data.submissions).filter((s) =>
    promptIds.has(s.prompt_id)
  );
}

module.exports = {
  getAll,
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
  getSubmissionsByEvent,
  createSubmission,
  getParticipantsByEvent,
  createParticipant,
  getParticipantBySession,
  deleteParticipant,
};
