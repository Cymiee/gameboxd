# Shelved (gameboxd) — Claude Code Project Config

Social web app for video games (Letterboxd for games): log games, rate/review, pin top 3, add friends, friend activity feed.

**Web-only.** Native mobile app retired; web is mobile-first responsive — every change must work at 375px width.

## Monorepo
```
shelved/
├── lib/       # Shared TS logic — Supabase queries, IGDB client, types
├── web/       # React + Vite app (the product)
├── supabase/  # DB migrations + edge functions
└── package.json  # npm workspaces (lib, web)
```

## Tech stack
| Layer | Tool |
|---|---|
| Web | React + Vite + React Router |
| Shared logic | TS `lib/` package |
| Backend/Auth/DB | Supabase |
| Game data | IGDB API (via Twitch creds, proxied) |
| State | Zustand |
| Styling | Inline styles + CSS vars in `web/src/index.css` (no Tailwind) |
| Deploy | Vercel (push to `main`) |
| CI | GitHub Actions — `npm ci && npm run typecheck` |

## DB tables (Supabase/Postgres, RLS on everywhere)
`users`, `top_games`, `game_logs`, `friendships`, `activity`, `lists`/`list_games`, `user_profile_tags` — exact columns live in `supabase/migrations/`.

## Enforced rules

**Architecture**
- All Supabase/IGDB data access lives in `lib/` — UI never calls `supabase.from()` directly, only `@gameboxd/lib` query functions (client passed in). Exception: `supabase.auth.*` in `App.tsx`/`SettingsPage.tsx`.
- IGDB calls go through the `igdb-proxy` edge function — Twitch secret never reaches the client.
- No hardcoded secrets; anon key only client-side, via `.env` (`VITE_`-prefixed).
- Always `if (error) throw error` on Supabase calls — never assume success.

**Code style**
- TS strict mode; `exactOptionalPropertyTypes` on in `web/` — never pass `undefined` to an optional prop, use `{...(cond ? { prop: val } : {})}`.
- No `any`. Functional components only. async/await, no `.then()` chains.
- Explicit prop interfaces. DB query fns verb-first camelCase (`getUserGameLogs`).
- Commit-ready only: no debug logs, no unmarked TODOs.

**Responsive**
- Mobile-first, must work at 375px, touch-friendly, no horizontal overflow.
- Use `useIsMobile()` (`web/src/hooks/useIsMobile.ts`, 640px breakpoint) for inline-style branching; prefer intrinsic CSS (`minmax(min(100%,…))`, `clamp()`) where sufficient.
- Hover-only affordances need a tap equivalent.

**Component size**: no hard line limit — split when already touching a file, not just for length.

## How to work with me
- One feature at a time — don't start the next until the current one works.
- Ask before big decisions: restructuring, schema changes, new libraries.
- Pause after each feature with a summary; wait for confirmation.
- Never delete/overwrite working code without asking.
