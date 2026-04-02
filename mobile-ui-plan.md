# Shelved Mobile UI — Improvement Plan & Prompt

Use this document as a prompt for each change. Work through them in order, one at a time. After each change, review the result before moving to the next.

---

## 1. Welcome Screen — Animated Looping Marquee

**File:** `gameboxd/mobile/app/(tabs)/index.tsx`

The logged-out welcome screen currently has a static row of 5 game covers. Replace it with a continuously auto-scrolling horizontal marquee that loops seamlessly.

Implementation notes:
- Duplicate the array of game covers (concatenate the array with itself) so the loop is invisible
- Use `react-native-reanimated` (already installed): drive a `useSharedValue` with `withRepeat(withTiming(..., { duration: 35000 }), -1)` to translate the row left continuously
- Speed should be slow and ambient — around 30–40 seconds per full loop
- Keep the left and right fade gradient overlays using `expo-linear-gradient` (already installed)
- The heading ("Find your next favourite game."), subheading, Sign Up button, and sign-in link stay exactly as they are — only the cover art row changes
- Use `overflow: hidden` on the container so covers clip at the screen edges

---

## 2. Shelf — Semantic Color Coding Per Status

**File:** `gameboxd/mobile/app/(tabs)/shelf.tsx`

The 4 status sections (Completed, Playing, Want to Play, Dropped) all look identical. Add color accents to visually differentiate them.

Color mapping:
- **Completed** → green `#4ade80`
- **Playing** → blue `#60a5fa`
- **Want to Play** → amber `#fbbf24`
- **Dropped** → red `#f87171`

Apply each color to:
1. The section header label text
2. The count number/badge next to the label
3. A 3px left-side accent border on the section container (use `borderLeftWidth: 3, borderLeftColor: <color>`)

Everything else stays the same — dark background, game cover thumbnails, dividers, navigation behavior.

---

## 3. Profile — Top 3 Games as a Showcase

**File:** `gameboxd/mobile/app/(tabs)/profile.tsx`

The "Favourite Games" section exists but is buried below the stats row. The top 3 games should be the personality centrepiece of the profile — the first thing you see after the avatar and username.

Changes:
- Move the "Favourite Games" section above the stats row (between the username/bio and the stats)
- Make the game cards slightly larger than they currently are
- Add a subtle drop shadow or a faint glow border (e.g., `borderColor: '#e4ff1a', borderWidth: 1` with low opacity, or `shadowColor`) to each card to make them feel like featured items
- Keep the cards exactly as they are (cover art, add button for empty slots) — do not replace them with text chips or tags
- Label the section something like "Top Games" or "Favourites" with a slightly bolder heading than it currently has

---

## 4. Home/Discover — Featured Game Hero Section

**File:** `gameboxd/mobile/app/(tabs)/discover.tsx`

Add a "Featured Game" hero card at the very top of the discover feed, visible only when the user is logged in. This should be the first thing a logged-in user sees when they open the Discover tab.

Design:
- Pull the first game from the trending games list as the featured game
- Full-bleed background: the game's cover art, blurred and darkened (use `blurRadius` on an `Image` + a dark overlay with `opacity: 0.5`)
- On top of the background, show the game cover art as a card that overflows upward slightly out of its container — use `overflow: visible` on the parent and a negative `marginTop` or absolute position on the cover card to create a sense of depth (the image "pops" forward)
- Show: game title (large, bold, white), one genre tag pill, and a "View Game" button that navigates to the game detail screen
- Entrance animation: fade in + slide up on mount using `react-native-reanimated` (`useSharedValue` starting at `opacity: 0, translateY: 20`, animating to `opacity: 1, translateY: 0` on mount)
- If no trending game is available yet (loading state), show a skeleton placeholder of the same height

---

## 5. Game Detail Page — Visual Polish

**File:** `gameboxd/mobile/app/game/[id].tsx`

The game detail page is functional but feels flat. Make the hero section richer and the overall page feel more premium.

Changes:
- Increase the hero section height from 280px to around 340px
- The blurred background should use the full cover art with a stronger dark gradient overlay (top: transparent → bottom: `#0e0e10`) so the title text has contrast
- Genre tags: make them more prominent — slightly larger font, colored background pills (not just outlines), using a muted version of the accent color
- Metadata row (developer, release year): separate each item with a `·` divider and style them in a lighter grey so they read as secondary info
- "Friends' ratings" section: if there are no friends who have rated the game, hide this section entirely rather than showing an empty state
- General: ensure there's enough vertical spacing between sections so the page breathes — it currently feels cramped

---

## General Rules (apply to all changes)

- TypeScript strict mode — no `any` types
- Functional components only
- Use existing color constants from `gameboxd/mobile/constants/colors.ts` where possible; new one-off colors can be inlined as string literals
- No leftover `console.log` or TODO comments
- Keep each file under 150 lines where feasible; split into sub-components if a file grows too large
- Follow the existing import order and formatting style in each file
