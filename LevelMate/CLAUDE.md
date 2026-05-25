# LevelMate Mobile — Claude Code Guide

> **INSTRUCTION FOR CLAUDE**: Read this file at the start of every session.
> After any implementation work is complete (tasks finished, features working),
> update the "Implementation Status" and "File Map" sections before closing out.
> Keep entries concise — this file is a quick-load context, not documentation.

---

## Project Overview

LevelMate mobile app — Expo/React Native client for the LevelMate backend. Athletes discover nearby games, create sessions, track ELO, and manage their sport profiles.

**Backend**: Spring Boot API at `http://localhost:8080` (dev). Set `EXPO_PUBLIC_API_URL` in `.env`.

**Stack**
- Expo SDK 55, React Native 0.83.6, React 19.2.0
- Expo Router v4 (file-based routing)
- NativeWind v4 (Tailwind CSS for RN)
- TanStack Query v5
- Zustand v5 (auth store)
- Axios with JWT interceptors
- expo-secure-store (token storage)
- expo-location
- @react-native-community/datetimepicker v8.6.0
- date-fns

**Root**: `C:\Users\stupa\Downloads\LevelMate\LevelMate\`
**OpenSpec changes**: `openspec/changes/` — specs: `openspec/specs/`

---

## Key Decisions & Gotchas

- `npm install` requires `--legacy-peer-deps` (react-dom 19.2.6 peer conflict)
- Use `npx expo install` for Expo-managed packages — EXCEPT `expo-image-picker` which must use `npm install expo-image-picker --legacy-peer-deps` (expo-linking peer conflict)
- NativeWind v4 setup: `jsxImportSource: 'nativewind'` in babel + `withNativeWind` in metro + `global.css` imported in root `_layout.tsx`
- JWT `sub` claim decoded client-side to extract userId (backend `AuthResponse` does not include userId)
- Backend `RegisterRequest` requires `firstName` + `lastName` separately, NOT a single displayName field
- `useInfiniteQuery` in TanStack v5 requires `initialPageParam: 0` explicitly
- `expo-router/entry` is the `main` entry in package.json
- `"scheme": "levelmate"` required in app.json for deep linking
- Lucide icons: do NOT pass `style` prop directly to icon components inside a flex row — it causes rendering artifacts on some RN versions. Wrap icon in `<View style={{ flexShrink: 0 }}>` OR use as direct children of the row with no style prop at all
- PanResponder bottom sheets: must include `onStartShouldSetPanResponder: () => true` alongside `onMoveShouldSetPanResponder` or the gesture never fires on Android. Use `useNativeDriver: false` on translateY so you can clamp `dy` to ≥ 0 in JS
- Modal + close animation: use internal `modalVisible` state (stays true until spring finishes) to prevent Modal unmounting before animation completes
- Avatar: stored as base64 string in `avatar_data TEXT` column. Frontend sends/receives as `data:image/jpeg;base64,...` or raw base64; `Avatar` component handles both
- Dockerfile.dev: must `COPY scripts/ ./scripts/` BEFORE `RUN npm install` so the postinstall script exists when npm runs it

---

## Colour Palette (dark mode only)

| Token | Hex |
|-------|-----|
| primary | `#6C47FF` |
| secondary | `#FF6B35` |
| background | `#0F0F14` |
| surface | `#1A1A24` |
| text-secondary | `#9B9BAE` |
| border | `#2A2A3A` |
| success | `#22C55E` |
| warning | `#F59E0B` |
| error | `#EF4444` |

---

## Route Structure

```
app/
  _layout.tsx               ← root layout: QueryClientProvider, SafeAreaProvider, auth redirect
  (auth)/
    _layout.tsx             ← headerless Stack
    login.tsx
    register.tsx
  (tabs)/
    _layout.tsx             ← Tabs: Discover, My Games, Create, Profile
    discover.tsx
    my-games.tsx
    create.tsx
    profile.tsx
  onboarding/
    sports.tsx              ← sport picker shown after first registration
  session/
    [id].tsx                ← session detail
  user/
    [id].tsx                ← public user profile
```

---

## Auth Flow

1. App starts → `authStore.initialize()` reads SecureStore
2. No token → redirect `/(auth)/login`
3. Token found → fetch `GET /api/v1/users/{userId}/profile`
4. No sports on profile → redirect `/onboarding/sports`
5. Sports present → redirect `/(tabs)/discover`
6. 401 on any request → axios interceptor silently refreshes token; on failure clears store + redirects to login

Token keys in SecureStore: `levelmate_access_token`, `levelmate_refresh_token`, `levelmate_user_id`

---

## API Notes

- Backend returns `GameSessionResponse` with flat `sportId`/`sportName` fields — NOT a nested `sport` object
- `GET /api/v1/users/{userId}/profile` returns `{ userId, displayName, avatarUrl, avatarData, sports[], coachProfiles[] }`
  - `sports[].sportId` is a UUID — always use this when sending `sportId` to backend, not hard-coded strings
- `PATCH /api/v1/users/me/profile` — body: `{ displayName?, avatarData? }`. Null `avatarData` clears the avatar
- `GET /api/v1/game-sessions` returns `Page<GameSessionResponse>` — access via `.content` or `.pages[].content`
- `GET /api/v1/game-sessions/{id}/result` returns 404 if no result reported yet — handle with try/catch, return null
- `GET /api/v1/users/me/pending-results` returns `PendingResult[]` with `locationName` and `participantCount` fields

---

## Implementation Status

### mobile-foundation — DONE (openspec change archived: `mobile-foundation`)

**What was built:**
- Expo Router v4 + NativeWind v4 configured end-to-end
- Axios instance with JWT request interceptor + 401 refresh interceptor (concurrent refresh queue)
- `expo-secure-store` token helpers (`lib/auth.ts`)
- Zustand v5 auth store (`stores/authStore.ts`) — initialize, login, register, logout
- TanStack Query client (`lib/queryClient.ts`) — staleTime 60s, retry 1
- `lib/format.ts` — `formatSessionDate`, `formatEloDelta`, `formatDuration`
- Login screen, Register screen (firstName + lastName), Sports onboarding screen
- Root layout with auth redirect logic

**Key files:**
```
app/_layout.tsx
app/(auth)/login.tsx
app/(auth)/register.tsx
app/onboarding/sports.tsx
lib/api.ts               ← axios instance + interceptors
lib/auth.ts              ← SecureStore helpers
lib/queryClient.ts
lib/format.ts
stores/authStore.ts
types/index.ts
babel.config.js
metro.config.js
tailwind.config.js
global.css
nativewind-env.d.ts
.env                     ← EXPO_PUBLIC_API_URL=http://localhost:8080
```

---

### mobile-screens — DONE (openspec change: `mobile-screens`)

**What was built:**

| Screen | File | Notes |
|--------|------|-------|
| Discover | `app/(tabs)/discover.tsx` | Infinite scroll, location filter (±10km), sport chip filter, My Level toggle, skeleton loading, pull-to-refresh |
| My Games | `app/(tabs)/my-games.tsx` | Upcoming / Past split, HOST badge, empty state |
| Create Game | `app/(tabs)/create.tsx` | Full form: sport (from user's profile), date/time picker, duration stepper, players, level range, location + GPS, description |
| Profile | `app/(tabs)/profile.tsx` | Sports list + ELO/level/games played, Add Sport modal (real UUIDs from catalog), Coach Profiles, Logout |
| Session Detail | `app/session/[id].tsx` | Info + participants, action buttons (join/leave/cancel/complete/report/confirm/dispute), Report Result modal |
| Public Profile | `app/user/[id].tsx` | Read-only: sports, ELO, coach profiles |

**Shared components:**
```
components/ui/AvatarInitials.tsx   ← deterministic colour from userId hash
components/ui/StatusBadge.tsx      ← OPEN/FULL/CANCELLED/COMPLETED
components/ui/EloBadge.tsx         ← delta (±) or absolute ELO display
components/sports/SportChip.tsx    ← selectable chip
components/sports/LevelDots.tsx    ← 10-dot level indicator
components/sessions/SessionCard.tsx ← session list card
```

**Key notes:**
- `SessionCard` uses `session.sportName` (flat field) — backend never returns nested `sport` object in session responses
- Create screen fetches user's profile sports for the sport selector — uses real UUIDs, not hard-coded strings
- Session Detail fetches result separately (`enabled: status === 'COMPLETED'`); 404 from result endpoint → treated as no result
- Participants display shortened userId (first 8 chars) — backend participant records don't include displayName
- Add Sport modal filters out already-added sports using a Set diff against the sports catalog

---

### pending-result-sheet — DONE

**What was built:**
- `PendingResultSheet` — transparent Modal + Animated spring + PanResponder drag-to-dismiss (no third-party lib). Sport-coloured accent strip, halo icon ring, white card with left-border accent, player count row, press-scale animation on CTA, swipe hint text
- `stores/pendingSheetStore.ts` — Zustand store so `my-games.tsx` can open the sheet mounted in `_layout.tsx`
- My Games amber notification banner: `TouchableOpacity` with 3 direct children (Trophy → text column → ChevronRight). No wrapper Views on icons

**Key files:**
```
components/modals/PendingResultSheet.tsx
stores/pendingSheetStore.ts
app/(tabs)/my-games.tsx     ← banner + store usage
app/_layout.tsx             ← sheet mount + auto-popup (once per session)
```

**Key notes:**
- `onNavigate` callback pattern: parent calls `router.push()` 350ms after closing sheet to avoid Android nav-context issues inside Modal
- `hasShownReminder` flag in `_layout.tsx` prevents auto-popup firing more than once per session; does NOT block manual banner tap
- `PendingResultResponse` returns `locationName` and `participantCount` from backend

---

### avatar-upload — DONE

**What was built:**
- `components/ui/Avatar.tsx` — renders base64 image or falls back to `AvatarInitials`
- Register screen: optional avatar picker (circular placeholder, dashed border, `+` icon, × to remove)
- Profile screen: Edit Profile modal — display name input + avatar picker + Save → `PATCH /api/v1/users/me/profile`
- Backend: Flyway V17 (`avatar_data TEXT`), User entity field, `UpdateProfileRequest` DTO, `UserProfileService.updateProfile()`, `PATCH /me/profile` endpoint, optional `avatarData` on `RegisterRequest`

**Key files:**
```
components/ui/Avatar.tsx
app/(auth)/register.tsx
app/(tabs)/profile.tsx
app/user/[id].tsx           ← uses Avatar
app/session/[id].tsx        ← uses Avatar
stores/authStore.ts         ← register() accepts avatarData
```

---

## OpenSpec Workflow

Changes are tracked in `openspec/changes/<name>/`. Each change has:
- `proposal.md` — why and what
- `design.md` — how (architecture decisions)
- `specs/<capability>/spec.md` — requirements + scenarios (delta specs that feed into `openspec/specs/`)
- `tasks.md` — checkbox implementation tasks

To implement a change: `/opsx:apply`
To propose a new change: `/opsx:propose <description>`
To archive a completed change: `/opsx:archive`

**OpenSpec project root for mobile is `C:\Users\stupa\Downloads\LevelMate\LevelMate\`**
CLI commands must be run from that directory.

---

## Running Locally

**Option A — everything in Docker (from the repo root `LevelMate/`):**
```bash
docker compose up --build

# Physical device — pass your machine's LAN IP so Expo Go can reach Metro:
HOST_IP=192.168.x.x docker compose up
```

**Option B — run Expo locally, backend in Docker:**
```bash
# Start backend + DB (from repo root)
docker compose up backend postgres

# Start Expo locally (from this directory)
npm install --legacy-peer-deps
npx expo start
```

**Ports:**
- Metro bundler: `http://localhost:8081`
- Backend API: `http://localhost:8080`
- Postgres: `localhost:5433`

Backend must be running at `http://localhost:8080` (or `HOST_IP:8080` for physical devices). The `EXPO_PUBLIC_API_URL` env var controls this — set it in `.env` or pass via `HOST_IP`.

---

## What NOT to Build Yet

Coach booking/payment, push notifications, social feed, ELO history screen, leaderboard screen, search/filter by sport on profile.
