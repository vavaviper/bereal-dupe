const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const store = require("./data/store");
const { validateImage } = require("./classify");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "uploads"),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, /^image\//.test(file.mimetype));
  },
});

// ── Public routes ──────────────────────────────────────────────

app.post("/api/events", (req, res) => {
  const { name, access_type, access_value, admin_password, prompt_interval_minutes } = req.body;
  if (!name || !access_type || access_value == null) {
    return res.status(400).json({ error: "name, access_type, access_value required" });
  }
  if (!admin_password) {
    return res.status(400).json({ error: "admin_password required" });
  }
  if (!["code", "geo"].includes(access_type)) {
    return res.status(400).json({ error: "access_type must be 'code' or 'geo'" });
  }
  const event = {
    id: uuidv4(),
    name,
    access_type,
    access_value,
    admin_password,
    prompt_interval_minutes: Number(prompt_interval_minutes) || 5,
    created_at: new Date().toISOString(),
    prompts: [],
  };
  store.createEvent(event);
  const { admin_password: _, ...safeEvent } = event;
  res.status(201).json(safeEvent);
});

app.get("/api/events/:id", (req, res) => {
  const event = store.getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: "event not found" });
  const activePrompt = store.getActivePrompt(event.id);
  res.json({ ...event, active_prompt: activePrompt });
});

app.post("/api/events/:id/verify", (req, res) => {
  const event = store.getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: "event not found" });

  function trackParticipant() {
    const { session_id, display_name } = req.body;
    if (session_id) {
      const existing = store.getParticipantBySession(event.id, session_id);
      if (!existing) {
        store.createParticipant({
          id: uuidv4(),
          event_id: event.id,
          session_id,
          display_name: display_name || null,
          joined_at: new Date().toISOString(),
        });
      }
    }
  }

  if (event.access_type === "code") {
    const { code } = req.body;
    if (code === event.access_value) {
      trackParticipant();
      return res.json({ ok: true, event_id: event.id });
    }
    return res.status(403).json({ ok: false, error: "invalid code" });
  }

  if (event.access_type === "geo") {
    const { lat, lng } = req.body;
    if (lat == null || lng == null) {
      return res.status(400).json({ error: "lat and lng required" });
    }
    const target = event.access_value;
    const dist = haversine(lat, lng, target.lat, target.lng);
    if (dist <= target.radius_meters) {
      trackParticipant();
      return res.json({ ok: true, event_id: event.id });
    }
    return res.status(403).json({ ok: false, error: "outside event radius" });
  }
});

app.get("/api/events/:id/submissions", (req, res) => {
  const event = store.getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: "event not found" });
  const activePrompt = store.getActivePrompt(event.id);
  if (!activePrompt) return res.json({ submissions: [], prompt: null });
  const subs = store
    .getSubmissionsByPrompt(activePrompt.id)
    .filter((s) => s.validated);
  res.json({ submissions: subs, prompt: activePrompt });
});

app.post("/api/events/:id/submit", upload.single("image"), async (req, res) => {
  const event = store.getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: "event not found" });

  const activePrompt = store.getActivePrompt(event.id);
  if (!activePrompt) {
    return res.status(400).json({ error: "no active prompt" });
  }

  const { user_session_id } = req.body;
  if (!user_session_id) {
    return res.status(400).json({ error: "user_session_id required" });
  }

  const existing = store.getSubmissionBySession(activePrompt.id, user_session_id);
  if (existing) {
    return res.status(409).json({ error: "already submitted for this prompt" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "image file required" });
  }

  const result = await validateImage(req.file.path, activePrompt.text);

  const submission = {
    id: uuidv4(),
    prompt_id: activePrompt.id,
    user_session_id,
    image_url: `/uploads/${req.file.filename}`,
    validated: result.valid,
    submitted_at: new Date().toISOString(),
  };
  store.createSubmission(submission);
  res.status(201).json(submission);
});

// ── Organizer routes ───────────────────────────────────────────

app.get("/organizer/events", (_req, res) => {
  res.json(store.getEvents());
});

app.get("/organizer/events/:id/prompts", (req, res) => {
  const event = store.getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: "event not found" });
  res.json(store.getPromptsByEvent(event.id));
});

app.post("/organizer/events/:id/prompts", (req, res) => {
  const event = store.getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: "event not found" });

  const { text, duration_seconds } = req.body;
  if (!text || !duration_seconds) {
    return res.status(400).json({ error: "text and duration_seconds required" });
  }

  const prompt = {
    id: uuidv4(),
    event_id: event.id,
    text,
    fired_at: null,
    duration_seconds: Number(duration_seconds),
    active: false,
  };
  store.createPrompt(prompt);
  res.status(201).json(prompt);
});

app.post("/organizer/events/:id/prompts/:pid/fire", (req, res) => {
  const prompt = store.getPrompt(req.params.pid);
  if (!prompt || prompt.event_id !== req.params.id) {
    return res.status(404).json({ error: "prompt not found" });
  }

  const currentActive = store.getActivePrompt(req.params.id);
  if (currentActive && currentActive.id !== prompt.id) {
    store.updatePrompt(currentActive.id, { active: false });
  }

  const updated = store.updatePrompt(prompt.id, {
    fired_at: new Date().toISOString(),
    active: true,
  });
  res.json(updated);
});

app.post("/organizer/events/:id/prompts/:pid/end", (req, res) => {
  const prompt = store.getPrompt(req.params.pid);
  if (!prompt || prompt.event_id !== req.params.id) {
    return res.status(404).json({ error: "prompt not found" });
  }
  const updated = store.updatePrompt(prompt.id, { active: false });
  res.json(updated);
});

// ── Admin routes ──────────────────────────────────────────────

function checkAdmin(req, res) {
  const event = store.getEvent(req.params.id);
  if (!event) {
    res.status(404).json({ error: "event not found" });
    return null;
  }
  const password = req.headers["x-admin-password"];
  if (!password || password !== event.admin_password) {
    res.status(401).json({ error: "unauthorized" });
    return null;
  }
  return event;
}

app.post("/api/events/:id/admin/login", (req, res) => {
  const event = store.getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: "event not found" });
  const { password } = req.body;
  if (password !== event.admin_password) {
    return res.status(401).json({ error: "invalid password" });
  }
  const { admin_password: _, ...safeEvent } = event;
  res.json({ ok: true, event: safeEvent });
});

app.get("/api/events/:id/admin/dashboard", (req, res) => {
  const event = checkAdmin(req, res);
  if (!event) return;
  const prompts = store.getPromptsByEvent(event.id);
  const members = store.getParticipantsByEvent(event.id);
  const submissions = store.getSubmissionsByEvent(event.id);
  const { admin_password: _, ...safeEvent } = event;
  res.json({ event: safeEvent, prompts, members, submissions });
});

app.put("/api/events/:id/admin/settings", (req, res) => {
  const event = checkAdmin(req, res);
  if (!event) return;
  const { name, prompt_interval_minutes } = req.body;
  const updates = {};
  if (name) updates.name = name;
  if (prompt_interval_minutes != null)
    updates.prompt_interval_minutes = Number(prompt_interval_minutes);
  const updated = store.updateEvent(event.id, updates);
  const { admin_password: _, ...safeEvent } = updated;
  res.json(safeEvent);
});

app.get("/api/events/:id/admin/members", (req, res) => {
  const event = checkAdmin(req, res);
  if (!event) return;
  const members = store.getParticipantsByEvent(event.id);
  const submissions = store.getSubmissionsByEvent(event.id);
  const membersWithStats = members.map((m) => ({
    ...m,
    submission_count: submissions.filter(
      (s) => s.user_session_id === m.session_id
    ).length,
  }));
  res.json(membersWithStats);
});

app.delete("/api/events/:id/admin/members/:mid", (req, res) => {
  const event = checkAdmin(req, res);
  if (!event) return;
  store.deleteParticipant(req.params.mid);
  res.json({ ok: true });
});

app.delete("/api/events/:id/admin/prompts/:pid", (req, res) => {
  const event = checkAdmin(req, res);
  if (!event) return;
  const prompt = store.getPrompt(req.params.pid);
  if (!prompt || prompt.event_id !== event.id) {
    return res.status(404).json({ error: "prompt not found" });
  }
  store.deletePrompt(prompt.id);
  res.json({ ok: true });
});

app.get("/api/events/:id/admin/submissions", (req, res) => {
  const event = checkAdmin(req, res);
  if (!event) return;
  const prompts = store.getPromptsByEvent(event.id);
  const submissions = store.getSubmissionsByEvent(event.id);
  const grouped = prompts.map((p) => ({
    prompt: p,
    submissions: submissions.filter((s) => s.prompt_id === p.id),
  }));
  res.json(grouped);
});

// ── Helpers ────────────────────────────────────────────────────

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

app.listen(PORT, () => console.log(`Candid server running on :${PORT}`));
