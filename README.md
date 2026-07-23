# Shelved

A social web app for tracking, rating, and discovering video games — inspired by Letterboxd.

Log games you've played, write reviews, rate them, pin your top 3 to your profile, follow friends, and see what they've been playing. Works great on your phone's browser — the UI is mobile-first responsive.

## Features

- **Game logging** — mark games as Playing, Completed, Dropped, or Want to Play
- **Ratings & reviews** — rate games out of 10 and write a review
- **Top 3** — pin your three favourite games to your profile
- **Liked games** — heart games to save them to your profile
- **Friends** — send and accept friend requests, view friend profiles
- **Activity feed** — see a live feed of what your friends are logging and reviewing
- **Browse & search** — search by title or filter by genre and theme
- **Recommendations** — personalised suggestions based on your most-played genres

## Tech Stack

| Layer | Tool |
|---|---|
| Web | React + Vite + React Router |
| Shared logic | TypeScript `lib/` package (npm workspaces) |
| Backend / Auth / DB | Supabase (Postgres + RLS) |
| Game data | IGDB API |
| State management | Zustand |
| Deploy | Vercel |
| CI | GitHub Actions (typecheck on push/PR) |

## Project Structure

```
shelved/
├── lib/        # Shared TypeScript logic — Supabase queries, IGDB client, types
├── web/        # React + Vite web app
└── supabase/   # Database migrations and edge functions
```

All data-fetching logic lives in `lib/` — `web/` doesn't talk to Supabase or IGDB directly.

> The retired native mobile app (Expo) is preserved on the `archive/mobile-native` branch.

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- [IGDB / Twitch API credentials](https://api-docs.igdb.com/#account-creation)

### 1. Clone and install

```bash
git clone https://github.com/your-username/shelved.git
cd shelved
npm install
```

### 2. Set up environment variables

Create `web/.env`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Set the IGDB credentials as Supabase edge function secrets (used by the `igdb-proxy` function):

```env
IGDB_CLIENT_ID=your_twitch_client_id
IGDB_CLIENT_SECRET=your_twitch_client_secret
```

### 3. Run database migrations

Push the migrations to your Supabase project:

```bash
npx supabase db push
```

### 4. Run the app

```bash
npm run dev
```

## Database Schema

| Table | Description |
|---|---|
| `users` | Profiles — username, bio, avatar |
| `game_logs` | Per-user game entries — status, rating, review, liked |
| `top_games` | Up to 3 pinned games per user |
| `friendships` | Friend requests and accepted connections |
| `activity` | Event log for the activity feed |
| `lists` / `list_games` | User-curated game lists (no web UI yet) |

Row Level Security is enabled on all tables.

## Deployment

The web app is deployed on **Vercel**. Push to `main` to trigger a production deployment. Ensure the environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are set in your Vercel project settings.
