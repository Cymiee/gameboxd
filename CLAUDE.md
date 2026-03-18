# Gameboxd — Claude Code Project Config

## What this project is
A social app for video games, inspired by Letterboxd. Users can log games, rate them, write reviews, pin their top 3 games on their profile, add friends, and see a feed of their friends' activity. It has a mobile app (Expo / React Native) and a web app (React + Vite) that share a common logic layer.

---

## Monorepo structure
```
gameboxd/
├── lib/          # Shared TypeScript logic (Supabase, IGDB, hooks, types)
├── mobile/       # Expo (React Native) app
├── web/          # React + Vite app
├── CLAUDE.md     # This file
└── package.json  # npm workspaces root
```

**Rule:** All Supabase queries, IGDB API calls, types, and React hooks live in `lib/`. Neither `mobile/` nor `web/` should contain data-fetching logic — they import from `lib/` only.

---

## Tech stack

| Layer | Tool |
|---|---|
| Mobile | Expo (React Native) with Expo Router |
| Web | React + Vite + React Router |
| Shared logic | TypeScript `lib/` package |
| Backend + Auth + DB | Supabase |
| Game data | IGDB API (via Twitch credentials) |
| State management | Zustand |
| Styling (web) | Tailwind CSS |
| Mobile deploy | Expo EAS |
| Web deploy | Vercel |

---

## Database schema (Supabase / Postgres)

- `users` — id, username, bio, avatar_url, created_at
- `top_games` — user_id, game_igdb_id, position (1, 2, or 3)
- `game_logs` — id, user_id, game_igdb_id, status (playing/completed/dropped/want_to_play), rating (1–10, nullable), review (text, nullable), created_at, updated_at
- `friendships` — id, requester_id, addressee_id, status (pending/accepted), created_at
- `activity` — id, user_id, type (logged/rated/reviewed/topped), game_igdb_id, metadata (jsonb), created_at

---

## Code rules

### General
- TypeScript everywhere, strict mode on. No `any` types ever.
- Functional components only. No class components.
- Async/await only. Never `.then()` chains.
- One concern per file. Keep files small and focused.
- Never hardcode secrets. All keys go in `.env` and are accessed via `process.env`.

### File structure rules
- Supabase logic → `lib/supabase/`
- IGDB logic → `lib/igdb/`
- Shared types → `lib/types/index.ts`
- React hooks → `lib/hooks/`
- Mobile UI components → `mobile/components/`
- Web UI components → `web/src/components/`
- Never put data-fetching logic inside a UI component — use hooks from `lib/hooks/`

### Naming conventions
- Components: PascalCase (`GameCard.tsx`, `TopThree.tsx`)
- Hooks: camelCase with `use` prefix (`useGameLog.ts`, `useFeed.ts`)
- Utilities: camelCase (`formatRating.ts`, `formatDate.ts`)
- DB query functions: camelCase, verb-first (`getGameLog`, `createFriendRequest`, `updateTopGames`)

### Supabase rules
- Always handle errors explicitly — never assume a query succeeded
- Use Supabase Row Level Security (RLS) on all tables
- Never expose the Supabase service key on the client — use the anon key only

### IGDB rules
- Always cache IGDB responses where possible — avoid redundant API calls
- Always request only the fields you need (IGDB charges by request, not fields, but keep payloads lean)
- Handle rate limits gracefully with retry logic

### Component rules
- Props must always be explicitly typed with a TypeScript interface
- No prop drilling more than 2 levels deep — use Zustand or context instead
- Keep components under 150 lines. If longer, split it.

---

## Features (build in this order)

1. Monorepo scaffold + config
2. Supabase client setup + SQL schema migration
3. IGDB client + search function
4. Auth (signup, login, session persistence)
5. Profile page (top 3 games, stats, activity feed)
6. Game search + logging (status + rating + review)
7. Friends system (send/accept requests, view friend profiles)
8. Combined activity feed

---

## How to work with me

- **Build one feature at a time.** Don't start the next feature until the current one works.
- **Ask before making big decisions.** If you're about to restructure files, change the schema, or pick a new library — tell me first and explain why.
- **Pause after each feature.** After completing a feature, summarise what was built and what's next. Wait for me to confirm before continuing.
- **Never delete or overwrite working code** without asking first.
- **Commit-ready code only.** Every file you produce should be clean, no leftover debug logs, no TODOs unless explicitly marked.