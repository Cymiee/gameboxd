# Shelved (gameboxd) — Claude Code Project Config

## What this project is
A social **web app** for video games, inspired by Letterboxd. Users can log games, rate them, write reviews, pin their top 3 games on their profile, add friends, and see a feed of their friends' activity.

**This is a web-only project.** The native mobile app was retired (July 2026) — its code lives on the `archive/mobile-native` branch. The web app is mobile-first responsive instead; every change must stay usable at 375px width.

---

## Monorepo structure
```
shelved/
├── lib/          # Shared TypeScript logic (Supabase queries, IGDB client, types)
├── web/          # React + Vite app (the product)
├── supabase/     # DB migrations + edge functions
├── CLAUDE.md     # This file
└── package.json  # npm workspaces root (lib, web)
```

---

## Tech stack

| Layer | Tool |
|---|---|
| Web | React + Vite + React Router |
| Shared logic | TypeScript `lib/` package |
| Backend + Auth + DB | Supabase |
| Game data | IGDB API (via Twitch credentials) |
| State management | Zustand |
| Styling | Inline styles + CSS variables in `web/src/index.css` (no Tailwind) |
| Deploy | Vercel (push to `main`) |
| CI | GitHub Actions — `npm ci && npm run typecheck` on push/PR |

---

## Database schema (Supabase / Postgres)

- `users` — id, username, bio, avatar_url, created_at
- `top_games` — user_id, game_igdb_id, position (1, 2, or 3)
- `game_logs` — id, user_id, game_igdb_id, status (playing/completed/dropped/want_to_play), rating (1–10, nullable), review (text, nullable), is_liked, created_at, updated_at
- `friendships` — id, requester_id, addressee_id, status (pending/accepted), created_at
- `activity` — id, user_id, type (logged/rated/reviewed/topped), game_igdb_id, metadata (jsonb), created_at
- `lists` / `list_games` — user-curated game lists (lib support exists; no web UI yet)

Row Level Security is enabled on all tables.

---

## Rules (the ones that are actually enforced)

### Architecture
- **All Supabase and IGDB data access lives in `lib/`.** UI code never calls `supabase.from()` directly — it imports query functions from `@gameboxd/lib` and passes the client in. (`supabase.auth.*` session calls in `App.tsx`/`SettingsPage.tsx` are the accepted exception.)
- IGDB calls from the browser go through the `igdb-proxy` Supabase edge function. Twitch client secret never ships to the client.
- Never hardcode secrets; anon key only on the client. Keys come from `.env` (`VITE_`-prefixed for the browser).
- Always handle Supabase errors explicitly (`if (error) throw error`), never assume success.

### Code style
- TypeScript strict mode; `exactOptionalPropertyTypes` is on in `web/` — never pass `undefined` explicitly to an optional prop; use spread: `{...(cond ? { prop: val } : {})}`.
- No `any`. Functional components only. Async/await, no `.then()` chains in app code.
- Props typed with an explicit interface. DB query functions are verb-first camelCase (`getUserGameLogs`, `sendFriendRequest`).
- Commit-ready code only: no leftover debug logs, no unmarked TODOs.

### Responsive (web is the mobile app now)
- Mobile-first: everything must work at 375px — no horizontal overflow, touch-friendly targets.
- Use the `useIsMobile()` hook (`web/src/hooks/useIsMobile.ts`, 640px breakpoint) for inline-style branching; prefer intrinsically-responsive CSS (`minmax(min(100%, …))`, `clamp()`) where it's enough.
- Hover-only affordances must have a tap equivalent.

### Guidance, not law
Some files exceed the old 150-line component rule (`ProfilePage.tsx`, `GamePage.tsx`). Don't make files longer without reason, and split when you're already rewriting one — but size alone isn't a blocker.

---

## How to work with me

- **Build one feature at a time.** Don't start the next feature until the current one works.
- **Ask before making big decisions** — restructuring files, changing the schema, adding a library.
- **Pause after each feature**: summarise what was built and what's next; wait for confirmation.
- **Never delete or overwrite working code** without asking first.
