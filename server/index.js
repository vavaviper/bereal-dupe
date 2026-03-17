require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const store = require("./data/store");
const { validateImage } = require("./classify");
const { uploadToUserUploads } = require("./firebase");

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

// ── Auto-cycle scheduler ──────────────────────────────────────

const scheduledCycles = new Map();

async function scheduleNextPrompt(eventId) {
  clearScheduledCycle(eventId);

  const event = await store.getEvent(eventId);
  if (!event || !event.auto_cycle) return;

  const activePrompt = await store.getActivePrompt(eventId);
  if (!activePrompt || !activePrompt.fired_at) return;

  const elapsed =
    (Date.now() - new Date(activePrompt.fired_at).getTime()) / 1000;
  const remaining = activePrompt.duration_seconds - elapsed;

  if (remaining <= 0) {
    await cycleToNextPrompt(eventId, activePrompt.id);
    return;
  }

  const timeoutId = setTimeout(async () => {
    await cycleToNextPrompt(eventId, activePrompt.id);
  }, remaining * 1000);

  scheduledCycles.set(eventId, timeoutId);
}

function clearScheduledCycle(eventId) {
  const existing = scheduledCycles.get(eventId);
  if (existing) {
    clearTimeout(existing);
    scheduledCycles.delete(eventId);
  }
}

async function cycleToNextPrompt(eventId, currentPromptId) {
  scheduledCycles.delete(eventId);

  const event = await store.getEvent(eventId);
  if (!event || !event.auto_cycle) return;

  await store.updatePrompt(currentPromptId, { active: false });

  const prompts = (await store.getPromptsByEvent(eventId)).sort(
    (a, b) =>
      new Date(a.created_at || 0).getTime() -
      new Date(b.created_at || 0).getTime()
  );

  const currentIndex = prompts.findIndex((p) => p.id === currentPromptId);
  const nextPrompt = prompts[currentIndex + 1];

  if (nextPrompt) {
    await store.updatePrompt(nextPrompt.id, {
      fired_at: new Date().toISOString(),
      active: true,
    });
    await scheduleNextPrompt(eventId);
  }
}

// ── Helper to strip sensitive fields ──────────────────────────

function sanitizeEvent(event) {
  if (!event) return event;
  const { admin_password, passcode, ...safe } = event;
  return safe;
}

// ── Public routes ──────────────────────────────────────────────

app.get("/api/events/nearby", async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: "lat and lng query params required" });
  }

  const geoEvents = await store.getGeoEvents();
  const results = [];
  for (const ev of geoEvents) {
    const target = ev.access_value;
    const distance_meters = Math.round(
      haversine(lat, lng, target.lat, target.lng)
    );
    const active_prompt = await store.getActivePrompt(ev.id);
    results.push({ ...sanitizeEvent(ev), distance_meters, active_prompt });
  }
  results.sort((a, b) => a.distance_meters - b.distance_meters);

  res.json(results);
});

app.post("/api/events", async (req, res) => {
  const { name, access_type, access_value, admin_password, prompt_interval_minutes, visibility, passcode: eventPasscode } = req.body;
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
    auto_cycle: false,
    visibility: visibility || "public",
    passcode: eventPasscode || null,
    created_at: new Date().toISOString(),
    prompts: [],
  };
  await store.createEvent(event);
  res.status(201).json(sanitizeEvent(event));
});

app.get("/api/events/:id", async (req, res) => {
  const event = await store.getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: "event not found" });
  const activePrompt = await store.getActivePrompt(event.id);
  res.json({ ...sanitizeEvent(event), active_prompt: activePrompt });
});

app.post("/api/events/:id/verify", async (req, res) => {
  const event = await store.getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: "event not found" });

  async function trackParticipant() {
    const { session_id, display_name } = req.body;
    if (session_id) {
      const existing = await store.getParticipantBySession(event.id, session_id);
      if (!existing) {
        await store.createParticipant({
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
    if (String(code).toUpperCase() === String(event.access_value).toUpperCase()) {
      await trackParticipant();
      return res.json({ ok: true, event_id: event.id });
    }
    return res.status(403).json({ ok: false, error: "invalid code" });
  }

  if (event.access_type === "geo") {
    const { lat, lng, passcode } = req.body;
    if (lat == null || lng == null) {
      return res.status(400).json({ error: "lat and lng required" });
    }
    const target = event.access_value;
    const dist = haversine(lat, lng, target.lat, target.lng);
    if (dist > target.radius_meters) {
      return res.status(403).json({ ok: false, error: "outside event radius" });
    }
    if (event.visibility === "private") {
      if (!passcode || String(passcode).toUpperCase() !== String(event.passcode).toUpperCase()) {
        return res.status(403).json({ ok: false, error: "invalid passcode" });
      }
    }
    await trackParticipant();
    return res.json({ ok: true, event_id: event.id });
  }
});

app.get("/api/events/:id/submissions", async (req, res) => {
  const event = await store.getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: "event not found" });
  const activePrompt = await store.getActivePrompt(event.id);
  if (!activePrompt) return res.json({ submissions: [], prompt: null });
  const subs = await store.getSubmissionsByPrompt(activePrompt.id);
  res.json({ submissions: subs, prompt: activePrompt });
});

app.post("/api/events/:id/submit", upload.single("image"), async (req, res) => {
  const event = await store.getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: "event not found" });

  const activePrompt = await store.getActivePrompt(event.id);
  if (!activePrompt) {
    return res.status(400).json({ error: "no active prompt" });
  }

  const elapsed =
    (Date.now() - new Date(activePrompt.fired_at).getTime()) / 1000;
  if (elapsed > activePrompt.duration_seconds) {
    return res.status(400).json({ error: "prompt time window expired" });
  }

  const { user_session_id } = req.body;
  if (!user_session_id) {
    return res.status(400).json({ error: "user_session_id required" });
  }

  const existing = await store.getSubmissionBySession(activePrompt.id, user_session_id);
  if (existing) {
    return res.status(409).json({ error: "already submitted for this prompt" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "image file required" });
  }

  const result = await validateImage(req.file.path, activePrompt.text);

  const ext = path.extname(req.file.originalname).slice(1) || "jpg";
  const firebaseUrl = await uploadToUserUploads(req.file.path, req.params.id, ext);
  const imageUrl = firebaseUrl || `/uploads/${req.file.filename}`;

  const submission = {
    id: uuidv4(),
    prompt_id: activePrompt.id,
    user_session_id,
    image_url: imageUrl,
    validated: result.valid,
    confidence: result.confidence,
    submitted_at: new Date().toISOString(),
  };
  await store.createSubmission(submission);
  res.status(201).json(submission);
});

// ── Image proxy (avoids CORS/referrer issues for Firebase Storage) ────────

app.get("/api/image-proxy", async (req, res) => {
  const raw = req.query.url;
  if (!raw || typeof raw !== "string") {
    return res.status(400).send("Missing url query");
  }
  const url = decodeURIComponent(raw.trim());
  const allowed =
    url.startsWith("https://firebasestorage.googleapis.com/") ||
    url.startsWith("https://storage.googleapis.com/");
  if (!allowed) {
    return res.status(400).send("URL not allowed");
  }
  try {
    const resp = await fetch(url, { headers: { Accept: "image/*" } });
    if (!resp.ok) throw new Error(resp.statusText);
    const contentType = resp.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await resp.arrayBuffer());
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buffer);
  } catch (err) {
    console.warn("Image proxy error:", err.message);
    res.status(502).send("Failed to fetch image");
  }
});

// ── Leaderboard ────────────────────────────────────────────────

app.get("/api/leaderboard", async (_req, res) => {
  res.json(await store.getLeaderboard());
});

// ── Organizer routes ───────────────────────────────────────────

app.get("/organizer/events", async (_req, res) => {
  const events = await store.getEvents();
  res.json(events.map(sanitizeEvent));
});

app.get("/organizer/events/:id/prompts", async (req, res) => {
  const event = await store.getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: "event not found" });
  res.json(await store.getPromptsByEvent(event.id));
});

app.post("/organizer/events/:id/prompts", async (req, res) => {
  const event = await store.getEvent(req.params.id);
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
    created_at: new Date().toISOString(),
  };
  await store.createPrompt(prompt);
  res.status(201).json(prompt);
});

app.post("/organizer/events/:id/prompts/:pid/fire", async (req, res) => {
  const prompt = await store.getPrompt(req.params.pid);
  if (!prompt || prompt.event_id !== req.params.id) {
    return res.status(404).json({ error: "prompt not found" });
  }

  const currentActive = await store.getActivePrompt(req.params.id);
  if (currentActive && currentActive.id !== prompt.id) {
    await store.updatePrompt(currentActive.id, { active: false });
  }

  const updated = await store.updatePrompt(prompt.id, {
    fired_at: new Date().toISOString(),
    active: true,
  });
  await scheduleNextPrompt(req.params.id);
  res.json(updated);
});

app.post("/organizer/events/:id/prompts/:pid/end", async (req, res) => {
  const prompt = await store.getPrompt(req.params.pid);
  if (!prompt || prompt.event_id !== req.params.id) {
    return res.status(404).json({ error: "prompt not found" });
  }
  clearScheduledCycle(req.params.id);
  const updated = await store.updatePrompt(prompt.id, { active: false });
  res.json(updated);
});

// ── Admin routes ──────────────────────────────────────────────

async function checkAdmin(req, res) {
  const event = await store.getEvent(req.params.id);
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

app.post("/api/events/:id/admin/login", async (req, res) => {
  const event = await store.getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: "event not found" });
  const { password } = req.body;
  if (password !== event.admin_password) {
    return res.status(401).json({ error: "invalid password" });
  }
  res.json({ ok: true, event: sanitizeEvent(event) });
});

app.get("/api/events/:id/admin/dashboard", async (req, res) => {
  const event = await checkAdmin(req, res);
  if (!event) return;
  const prompts = await store.getPromptsByEvent(event.id);
  const members = await store.getParticipantsByEvent(event.id);
  const submissions = await store.getSubmissionsByEvent(event.id);
  res.json({ event: sanitizeEvent(event), prompts, members, submissions });
});

app.put("/api/events/:id/admin/settings", async (req, res) => {
  const event = await checkAdmin(req, res);
  if (!event) return;
  const { name, prompt_interval_minutes, auto_cycle } = req.body;
  const updates = {};
  if (name) updates.name = name;
  if (prompt_interval_minutes != null)
    updates.prompt_interval_minutes = Number(prompt_interval_minutes);
  if (auto_cycle != null) updates.auto_cycle = Boolean(auto_cycle);
  const updated = await store.updateEvent(event.id, updates);

  if (auto_cycle === true) {
    await scheduleNextPrompt(event.id);
  } else if (auto_cycle === false) {
    clearScheduledCycle(event.id);
  }

  res.json(sanitizeEvent(updated));
});

app.get("/api/events/:id/admin/members", async (req, res) => {
  const event = await checkAdmin(req, res);
  if (!event) return;
  const members = await store.getParticipantsByEvent(event.id);
  const submissions = await store.getSubmissionsByEvent(event.id);
  const membersWithStats = members.map((m) => ({
    ...m,
    submission_count: submissions.filter(
      (s) => s.user_session_id === m.session_id
    ).length,
  }));
  res.json(membersWithStats);
});

app.delete("/api/events/:id/admin/members/:mid", async (req, res) => {
  const event = await checkAdmin(req, res);
  if (!event) return;
  await store.deleteParticipant(req.params.mid);
  res.json({ ok: true });
});

app.delete("/api/events/:id/admin/prompts/:pid", async (req, res) => {
  const event = await checkAdmin(req, res);
  if (!event) return;
  const prompt = await store.getPrompt(req.params.pid);
  if (!prompt || prompt.event_id !== event.id) {
    return res.status(404).json({ error: "prompt not found" });
  }
  await store.deletePrompt(prompt.id);
  res.json({ ok: true });
});

app.get("/api/events/:id/admin/submissions", async (req, res) => {
  const event = await checkAdmin(req, res);
  if (!event) return;
  const prompts = await store.getPromptsByEvent(event.id);
  const submissions = await store.getSubmissionsByEvent(event.id);
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
