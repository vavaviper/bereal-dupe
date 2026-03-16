const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "db.json");

const empty = () => ({ events: {}, prompts: {}, submissions: {} });

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

module.exports = {
  getAll,
  getEvents,
  getEvent,
  createEvent,
  getPromptsByEvent,
  getPrompt,
  createPrompt,
  updatePrompt,
  getActivePrompt,
  getSubmissionsByPrompt,
  getSubmissionBySession,
  createSubmission,
};
