# TripSync component map

A reference for how the app's pages, components, and shared libs fit
together, current as of the "Manali theme" revamp (commit `b21f875`).

## Page routes → what they render

| Route | Page file | Uses |
|---|---|---|
| `/` (landing) | `app/page.tsx` | `HeroReel`, `HeroLabels`, `MoodStrip`, `SiteFooter`, `StickyCta`, `CreateTripWizard`, `PhotoBackdrop`, `FadeInSection` |
| `/` (wizard step) | same file, `view === "wizard"` | `CreateTripWizard` (owns its own steps + `PhotoBackdrop`) |
| `/` (created) | same file, `view === "created"` | `PhotoBackdrop` (background: `PAGE_BACKGROUNDS.created`) |
| `/trip/[tripId]/join` | `app/trip/[tripId]/join/page.tsx` | `PhotoBackdrop` (background: `join`) — skips `TripShell` chrome |
| `/trip/[tripId]/preferences` | `.../preferences/page.tsx` | `TripShell` → `TripHeroBand`, `Snowfall` (on submit) |
| `/trip/[tripId]/status` | `.../status/page.tsx` | `TripShell` → `TripHeroBand` |
| `/trip/[tripId]/options` | `.../options/page.tsx` | `TripShell` → `TripHeroBand` |
| `/trip/[tripId]/options/[optionId]` | `.../options/[optionId]/page.tsx` | `TripShell`, `Snowfall` + `IceSkyReveal` (on lock) |
| `/trip/[tripId]/chats` , `/chats/[conversationId]` | `.../chats/**/page.tsx` | `TripShell` → `TripHeroBand` |
| `/trip/[tripId]/help` | `.../help/page.tsx` | `TripShell` → `TripHeroBand` |

All `/trip/[tripId]/**` routes (except `/join`) are wrapped by
`app/trip/[tripId]/layout.tsx`, which renders `TripShell`.

## Components (`components/`)

| Component | Purpose |
|---|---|
| `TripShell.tsx` | Per-trip page frame: nav + `TripHeroBand` + content column. Passes through untouched on `/join` (that page is a standalone photo backdrop). |
| `TripHeroBand.tsx` | The photo band at the top of every signed-in trip page. Picks a `PAGE_BACKGROUNDS` entry from the current pathname (`backgroundFor`), shows trip name/countdown/member avatars; `compact` mode on detail pages (one option, one chat) so content isn't pushed below the fold. |
| `TripNav.tsx` | Tab bar (Submit / Status / Options / Chats / Help), hidden on `/join`. |
| `HeroReel.tsx` | The landing hero's autoplay video (`manali-reel.mp4`/`.webm`), muted-autoplay with a play/pause + mute toggle, an ambient color-glow canvas sampled from the poster frame, and a `"phone"` bezel variant. Respects reduced-motion/Save-Data (falls back to poster + play button). |
| `HeroLabels.tsx` (`landing/`) | Small floating badges/labels overlaid on the hero reel. |
| `MoodStrip.tsx` (`landing/`) | Row of destination-vibe photo tiles (`VIBE_PHOTOS`); clicking one calls `onPick(vibe)`, which pre-fills the wizard's vibe and jumps straight into it. |
| `SiteFooter.tsx` (`landing/`) | Minimal landing-page footer. |
| `StickyCta.tsx` (`landing/`) | Persistent "Start planning" button that appears once the hero (`targetId`) scrolls out of view. |
| `CreateTripWizard.tsx` | The whole multi-step trip-creation flow (name → dates → deadline → you → friends → review), each step over its own `PAGE_BACKGROUNDS.wizard` photo via `PhotoBackdrop`. Exports `CreatedTrip` (the shape returned on success) and `pushWizardStep` (keeps step position in browser history so back-button works step-by-step). |
| `PhotoBackdrop.tsx` | Generic full-screen photo + scrim wrapper for a single centered card (create/created/join). Takes a `Photo` from `lib/backgrounds.ts`. |
| `IceSkyReveal.tsx` | Celebratory "plan locked" screen: starfield background (pure CSS radial-gradients, no images) + trip summary + share link. |
| `Snowfall.tsx` | One-shot CSS snowfall burst used as a "you did it" moment right after submitting preferences or locking a plan. No-ops under reduced-motion. |
| `FadeInSection.tsx` | IntersectionObserver fade/slide-up wrapper for scroll-triggered reveals (landing page sections). |

## `lib/`

| Module | Purpose |
|---|---|
| `backgrounds.ts` | Single source of truth for every photo the app shows: `PAGE_BACKGROUNDS` (one per trip page + wizard/created/join) and `VIBE_PHOTOS` (one per destination type). Each entry carries `src`, `alt`, an `object-position` hint, and the source `pexelsId` for re-downloading. All images are downloaded into `/public`, not hotlinked. |
| `ui.ts` | Shared class-string constants (`button.*`, `card`, `frostedCard`, `input`, `label`, `pageHeading`/`pageSubheading`) built on the `.btn-glacier` / `.btn-ice` / `.glass-surface` utility classes defined in `app/globals.css`. |
| `format.ts` | `formatCountdown`, `formatDateRange` — display helpers used by `TripHeroBand` and the status page. |
| `trip-events.ts` | Tiny pub/sub (`onTripChanged`) so one page's action (e.g. locking an option) can tell `TripHeroBand` elsewhere on the page to refetch, without prop-drilling. |
| `client-session.ts` | Browser-side session (member id/name in `localStorage`) plus `saveVibeHint`/read-back, used to carry a mood-strip pick from the landing page into the wizard. |
| `gemini.ts` | AI trip-option generation (`generateTripOptions`) and the "ask AI" helper (`answerTripQuestion`) — grown since the revamp to harden JSON-schema validation/retries. |
| `matching.ts`, `fit.ts`, `types.ts`, `auth.ts`, `trip-server.ts`, `conversation-server.ts` | Unchanged from before the revamp — matching engine, fit-grid scoring, shared types, PIN/session auth, trip/conversation lookups. |

## Photo assets (`public/`)

- `hero-bg.jpg`, `manali-reel.mp4`/`.webm`/`manali-reel-poster.jpg` — landing hero.
- `bg/*.jpg` — one per `PAGE_BACKGROUNDS` entry (wizard, created, join, preferences, status, options, option detail, locked, chats, help).
- `tiles/*.jpg` — one per `VIBE_PHOTOS` entry (mountains, adventure, nature, spiritual, city, beach), used by `MoodStrip` and the preferences vibe-picker.

## Theming

Visual language is "carved from Himalayan ice": glacier-blue primary
actions, frosted/glass secondary surfaces, defined once in
`app/globals.css` (`.btn-glacier`, `.btn-ice`, `.glass-surface`,
`brand-*` color scale) and consumed everywhere through `lib/ui.ts`
rather than pages hand-rolling their own Tailwind combinations.
