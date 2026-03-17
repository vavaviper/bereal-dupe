/**
 * One-time migration: reads db.json and writes all data to Firebase Realtime Database.
 * Run with: node migrate.js
 */
const fs = require("fs");
const path = require("path");
const { db } = require("./firebase");

const DATA_FILE = path.join(__dirname, "data", "db.json");

async function migrate() {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch (err) {
    console.error("Could not read db.json:", err.message);
    process.exit(1);
  }

  const now = new Date().toISOString();
  let count = 0;

  // ── Events ──────────────────────────────────────────────────
  for (const event of Object.values(data.events || {})) {
    const normalized = {
      id: event.id,
      name: event.name,
      access_type: event.access_type,
      access_value: event.access_value,
      admin_password: event.admin_password || "admin",
      prompt_interval_minutes: event.prompt_interval_minutes ?? 5,
      auto_cycle: event.auto_cycle ?? false,
      created_at: event.created_at || now,
      prompts: event.prompts || [],
    };
    await db.ref(`events/${normalized.id}`).set(normalized);
    console.log(`  event: ${normalized.name} (${normalized.id})`);
    count++;
  }

  // ── Prompts ─────────────────────────────────────────────────
  for (const prompt of Object.values(data.prompts || {})) {
    const normalized = {
      id: prompt.id,
      event_id: prompt.event_id,
      text: prompt.text,
      fired_at: prompt.fired_at || null,
      duration_seconds: prompt.duration_seconds,
      active: prompt.active ?? false,
      created_at: prompt.created_at || now,
    };
    await db.ref(`prompts/${normalized.id}`).set(normalized);
    console.log(`  prompt: "${normalized.text}" (${normalized.id})`);
    count++;
  }

  // ── Submissions ─────────────────────────────────────────────
  for (const sub of Object.values(data.submissions || {})) {
    const normalized = {
      id: sub.id,
      prompt_id: sub.prompt_id,
      user_session_id: sub.user_session_id,
      image_url: sub.image_url,
      validated: sub.validated ?? true,
      submitted_at: sub.submitted_at || now,
    };
    await db.ref(`submissions/${normalized.id}`).set(normalized);
    console.log(`  submission: ${normalized.id}`);
    count++;
  }

  // ── Participants ────────────────────────────────────────────
  for (const p of Object.values(data.participants || {})) {
    const normalized = {
      id: p.id,
      event_id: p.event_id,
      session_id: p.session_id,
      display_name: p.display_name || null,
      joined_at: p.joined_at || now,
    };
    await db.ref(`participants/${normalized.id}`).set(normalized);
    console.log(`  participant: ${normalized.display_name || normalized.id}`);
    count++;
  }

  console.log(`\nMigration complete: ${count} documents written to Firebase RTDB.`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
