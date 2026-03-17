# Candid
Demo: https://bereal-dupe.vercel.app/

BeReal-style photo experience for private events. Organizers create events with access codes or geolocation locks, fire time-limited prompts, and attendees submit photos that appear on a live masonry canvas.

## Stack

- **Frontend:** Next.js 15 (App Router) + Tailwind CSS
- **Backend:** Express.js REST API
- **Storage:** Local `/server/uploads` (swap to cloud later)
- **Classification:** Stub returning `{ valid: true }` (swap to Gemini Vision later)
- **Data:** JSON file store (swap to DB later)

## Quick Start

```bash
# Terminal 1 — Express server
cd server
npm run dev
# → http://localhost:4000

# Terminal 2 — Next.js client
cd client
npm run dev
# → http://localhost:3000
```

## Pages

| Path | Description |
|------|-------------|
| `/` | Landing — enter event code or use geolocation |
| `/event/[id]` | Live canvas — masonry grid of submissions, 30s polling |
| `/event/[id]/submit` | Photo submission — camera capture or file upload |
| `/organizer` | Dashboard — create events, manage prompts |

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/events` | Create event |
| GET | `/api/events/:id` | Get event + active prompt |
| POST | `/api/events/:id/verify` | Verify entry code or geolocation |
| GET | `/api/events/:id/submissions` | Get validated submissions for active prompt |
| POST | `/api/events/:id/submit` | Upload image submission |
| GET | `/organizer/events` | List all events |
| GET | `/organizer/events/:id/prompts` | List prompts for event |
| POST | `/organizer/events/:id/prompts` | Add prompt |
| POST | `/organizer/events/:id/prompts/:pid/fire` | Fire a prompt |
| POST | `/organizer/events/:id/prompts/:pid/end` | End a prompt |

## Typical Flow

1. Go to `/organizer`, create an event with a code (e.g. `ABC123`)
2. Add a prompt like "Show me your best dance move" with 120s duration
3. Fire the prompt
4. Share the code — attendees go to `/`, enter `ABC123`, land on the live canvas
5. They tap "Submit Photo", take a pic, and it appears on the canvas
