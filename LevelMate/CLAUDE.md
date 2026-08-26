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
- Expo SDK 57, React Native 0.86.2, React 19.2.3 (upgraded from SDK 55 — see "expo-sdk-57-upgrade" below)
- Expo Router v4 (file-based routing)
- NativeWind v4 (Tailwind CSS for RN)
- TanStack Query v5
- Zustand v5 (auth store)
- Axios with JWT interceptors
- expo-secure-store (token storage)
- expo-location
- expo-haptics (tactile feedback — always via `lib/haptics.ts`, never imported directly)
- react-native-reanimated v4 + react-native-worklets (required separate peer dep since Reanimated v4)
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
- **Dockerfile.dev has NO bind-mount volume** — `COPY . .` happens once at image build time, so plain `docker compose up` reuses whatever was baked into the last built image. Any code change (including a new dependency in package.json) requires `docker compose up --build` to actually reach a device via Expo Go — this cost real debugging time when haptics silently "didn't work" because the container was stale.
- `EXPO_TOKEN` (root `.env`, generate at expo.dev/settings/access-tokens) authenticates the Expo CLI non-interactively inside Docker — required so Metro doesn't hang on the interactive "Log in / Proceed anonymously" prompt, and so Expo Go doesn't show manifest-signing warnings when it's signed into an account. Passed through in `compose.yaml`'s `expo` service environment.
- `StyleSheet.absoluteFillObject` was removed as of this RN version (SDK 57 / RN 0.86) — use `StyleSheet.absoluteFill` instead.
- Haptics only fire on a physical device via Expo Go — both the iOS Simulator and Android Emulator are no-ops (no vibration hardware). Also check the phone's system haptics: iOS Settings → Sounds & Haptics → System Haptics, and Low Power Mode disables/reduces them.

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
    _layout.tsx             ← Tabs: Discover, My Games, Create, Profile (+ Admin if role=ADMIN)
    discover.tsx
    my-games.tsx
    create.tsx
    profile.tsx
    admin.tsx               ← ADMIN-only tab: Disputes + All Sessions
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
- `GET /api/v1/users/{userId}/profile` returns `{ userId, displayName, avatarUrl, avatarData, sports[], coachProfiles[], role }` where `role` is `'USER'` or `'ADMIN'`
  - `sports[].sportId` is a UUID — always use this when sending `sportId` to backend, not hard-coded strings
- `PATCH /api/v1/users/me/profile` — body: `{ displayName?, avatarData? }`. Null `avatarData` clears the avatar
- `GET /api/v1/game-sessions` returns `Page<GameSessionResponse>` — access via `.content` or `.pages[].content`
- `GET /api/v1/game-sessions/{id}/result` returns 404 if no result reported yet — handle with try/catch, return null
- `GET /api/v1/users/me/pending-results` returns `PendingResult[]` with `locationName` and `participantCount` fields
- `PATCH /api/v1/game-sessions/{id}/participants/{userId}/team` — assign team (body: `{ userId, team }`)
- `POST /api/v1/game-sessions/{id}/result/accept-counter` — original reporter accepts the counter-score proposal
- `GET /api/v1/admin/disputes` — admin only; returns dispute list with both score proposals
- `POST /api/v1/admin/disputes/{sessionId}/resolve` — admin only; body: `{ winnerTeam, scoreTeamA?, scoreTeamB? }`
- `GET /api/v1/admin/sessions` — admin only; paginated all-sessions list

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

### team-rebalancing — DONE

**What was built:**
- "Review Teams" button shown to captains on COMPLETED sessions with no result yet (reads `GET /api/v1/game-sessions/{id}/can-rebalance`)
- Tapping it opens a full-screen modal with the same 3-column team layout (Team A | Bench if any | Team B)
- Changes are made in local state (`rebalanceParticipants`) — nothing is saved until "Confirm Teams"
- "Confirm Teams" batch-PATCHes only the changed participants, then invalidates the session query
- Last-player-off-team guard: Alert fires and the move is prevented if it would empty a team
- Unbalanced-teams guard on open: Alert if one team is already empty when modal opens
- Report Result button stays available at all times — review is optional, not a gate
- `can-rebalance` query only enabled when `session.status === 'COMPLETED' && result === null && isParticipant`

**Key files:**
```
app/session/[id].tsx    ← canRebalanceData query, openRebalanceModal/rebalanceMovePlayer/confirmRebalance, modal JSX
```

---

### admin-tab — DONE

**What was built:**
- `app/(tabs)/admin.tsx` — two-tab screen (Disputes / All Sessions), visible only to ADMIN users
- Disputes tab: lists all DISPUTED results from `GET /api/v1/admin/disputes`; each card shows both score proposals, a "Resolve" button that opens a modal to pick winner + optional scores
- All Sessions tab: paginated list of every game session via `GET /api/v1/admin/sessions`
- Tab visibility: `_layout.tsx` reads `isAdmin` from `authStore`; sets `href: isAdmin ? undefined : null` on the Admin tab — `null` hides it from the tab bar completely
- `authStore` reads `role` from `GET /api/v1/users/{userId}/profile` response at initialize time; exposes `isAdmin` derived state

**Key files:**
```
app/(tabs)/admin.tsx          ← disputes + all sessions admin screen
app/(tabs)/_layout.tsx        ← href: isAdmin ? undefined : null for Admin tab
stores/authStore.ts           ← reads profile.role, sets role state
```

**Key notes:**
- `href: null` in Expo Router Tabs completely hides a tab from the tab bar (no visible tab, no accessible route for non-admins)
- Admin account must have `role = 'ADMIN'` in the database — set manually: `UPDATE users SET role = 'ADMIN' WHERE email = '...'`
- Admin account also needs at least one sport in their profile or they'll be redirected to onboarding

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
HOST_IP=192.168.x.x docker compose up --build
```
There is no bind-mount volume — `--build` is required every time source or `package.json`
changes, or the container just re-runs the last built image (see gotcha above). Optionally
set `EXPO_TOKEN` in the root `.env` (see `.env.example`) so the Expo CLI authenticates
non-interactively instead of showing manifest-signing warnings.

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

### dispute-reform — DONE

**What was built:**
- Captain badges (Shield icon) next to each team's captain in the team column view — read from `isCapt` on participant, never derived client-side
- PENDING_CONFIRMATION non-reporter view: "Dispute with Counter-Score" button only shown if `myParticipant.isCapt && myParticipant.team === 'TEAM_B'`; all other Team B members see a message identifying their captain by name
- DISPUTED card: amber warning with 24-hour auto-resolve message; countdown "Auto-resolves in approximately X hours" computed from `result.disputedAt` when present
- `isCapt: boolean` added to `GameParticipant` type; `disputedAt?: string` added to `GameResult` type

**Key files:**
```
types/index.ts              ← isCapt on GameParticipant, disputedAt on GameResult
app/session/[id].tsx        ← captain badge, restricted dispute button, auto-resolve countdown
```

---

---

### sport-system-revamp — DONE

**What was built:**
- 12 new sports added (Badminton, Table Tennis, Squash, Futsal, Handball, Rugby, Pickleball, Boxing, Martial Arts — ELO; Rock Climbing — GRADE_BASED; Weightlifting, Rowing — PERFORMANCE_BASED)
- `slug` column on sports (e.g. `basketball`, `rock_climbing`) — used for sport colour mapping
- `sport_metrics` table: per-sport metric definitions (key, label, inputType, unit, isRequired, displayOrder)
- `performance_pbs` extended with `metric_key`, `metric_value_text`, `metric_value_number` columns; `distance_meters`/`time_seconds` made nullable; partial unique index `(user_id, sport_id, metric_key) WHERE metric_key IS NOT NULL`
- Bouldering grades migrated from `user_sports.grade` → `performance_pbs` with `metric_key = 'current_grade'`
- `GET /api/v1/sports/{sportId}/metrics` — public endpoint returning metric definitions per sport
- Profile response (`GET /api/v1/users/{userId}/profile`) now includes `sportSlug` and `metrics[]` on each sport summary
- Add/Update sport endpoints now accept `metrics: [{metricKey, value}]` instead of `level/grade/eloRating`; `self_reported_level` metric is mirrored to `user_sports.level` for join level-range checks
- `lib/sportColors.ts` — per-slug colour map + fallback hash function
- `components/sports/SportMetricInput.tsx` — dynamic metric form: number dots (1-10), number with unit, duration (mm:ss / h:mm:ss), V-grade picker with V/Font toggle, French sport grade picker, text
- Profile sport cards: per-ratingType display (ELO = ELO badge + level dots; GRADE_BASED = grade badges; PERFORMANCE_BASED = metric rows); left colour strip using sport colour; "Edit" button per card
- Edit Sport modal: fetches metric definitions, pre-fills current values, dynamic form
- Add Sport modal: fetches metric definitions after sport selection, dynamic form
- Onboarding screen: ELO sports → level picker → `self_reported_level`; GRADE_BASED → text input → `current_grade`; PERFORMANCE_BASED → no metrics (set later from profile)

**Key files:**
```
backend/src/main/resources/db/migration/V22__add_sport_slug_and_new_sports.sql
backend/src/main/resources/db/migration/V23__create_sport_metrics.sql
backend/src/main/resources/db/migration/V24__extend_performance_pbs.sql
backend/src/main/java/.../users/entity/SportMetric.java
backend/src/main/java/.../users/repository/SportMetricRepository.java
backend/src/main/java/.../users/service/SportsCatalogService.java
backend/src/main/java/.../users/controller/SportsCatalogController.java
backend/src/main/java/.../users/service/UserSportProfileService.java
backend/src/main/java/.../users/service/UserProfileService.java
backend/src/main/java/.../users/dto/SportMetricDefinitionResponse.java
backend/src/main/java/.../users/dto/MetricValueRequest.java
lib/sportColors.ts
components/sports/SportMetricInput.tsx
app/(tabs)/profile.tsx
app/onboarding/sports.tsx
```

**Key notes:**
- Sport colour is derived from `sportSlug` — use `getSportColour(slug)` from `lib/sportColors.ts`
- `inputType` values: `number` (with `unit = '1-10'` → dot picker, else text), `duration` (with `unit = 'mm:ss'` or `'h:mm:ss'`), `grade_v`, `grade_french_sport`, `text`
- Duration values stored as total seconds (numeric string) in `metric_value_number`; formatted client-side
- V-grade picker supports V-scale (VB, V0–V17) and Font scale (5–8C+) with a toggle
- `user_sports.level` is still populated (from `self_reported_level` metric) for join/ELO compatibility
- All `GET /api/v1/sports/**` are public (no auth required)

---

### sport-type-aware-sessions — DONE

**What was built:**
- `GameSession` type: `sportSlug?`, `ratingType?`, `targetPace?`, `gradeMin?`, `gradeMax?` fields added
- `GameParticipant` type: `pbUpdateSubmitted: boolean` field added
- `create.tsx`: sport-type-aware form — ELO shows Team Size stepper (maxPlayers = teamSize×2) + skill level range; GRADE_BASED shows grade range chip pickers (from `/sports/{id}/metrics`) + "Group Session" chip; PERFORMANCE_BASED shows target pace text input + "Group Training" chip
- `session/[id].tsx`: team column view gated to ELO only (`isEloCompetitive`); result query disabled for non-ELO; PERFORMANCE_BASED completed sessions show PB update prompt + bottom sheet; Details row shows grade range or target pace by type; new `pb-submitted` mutation
- `SessionCard.tsx`: bottom-left badge shows grade range for GRADE_BASED, target pace for PERFORMANCE_BASED, level range for ELO

**Key files:**
```
types/index.ts
app/(tabs)/create.tsx
app/session/[id].tsx
components/sessions/SessionCard.tsx
```

**Key notes:**
- `showPbPrompt` is computed pre-hook (using `isParticipantEarly`) so it can gate query `enabled` without violating hook rules
- Result query's `enabled` is guarded to ELO_COMPETITIVE only — avoids unnecessary 404 calls for non-ELO sessions
- PB update sheet pre-fills from `GET /api/v1/users/{id}/profile` (cached under `['profile', userId]`); saves via `PUT .../sports/{sportId}` then `POST .../pb-submitted`
- `pbUpdateSubmitted` drives the prompt: once submitted, the prompt disappears on next session refetch

---

### post-session-reminders — DONE

**What was built:**
- `PendingResultSheet` extended with 3 new `pendingType` values: `PB_UPDATE`, `SESSION_LOG`, `CANCELLED_SESSION`
- `badgeFor()`, `headlineFor()`, `ctaLabelFor()` helpers in `PendingResultSheet.tsx` return type-specific content for all 5 pending types
- Session detail auto-acknowledges GRADE_BASED COMPLETED sessions and auto-cancelled sessions on mount (PATCH `/{id}/acknowledge`)
- Cancellation info card in session detail for `cancellationReasonInsufficientPlayers` sessions
- `DurationInput` extracted from `SportMetricInput.tsx` → `components/sports/DurationInput.tsx` (reusable, optional `borderColor`/`backgroundColor` override props)
- PB sheet keyboard fix: no `KeyboardAvoidingView`; `TouchableWithoutFeedback` backdrop; `InputAccessoryView` nativeID `'pb-number-done'` for number inputs; pinned footer buttons outside `ScrollView`
- PB sheet pre-fills metric fields with stored current PB values; green highlight when new value improves on current
- PB improvement logic: duration = green if lower (faster), number = green if higher (better)
- `LevelDots` updated with `newPlayer` prop — dots 5-10 shown at opacity 0.3 when `newPlayer=true`
- Edit Sport modal level lock: `gamesPlayed >= 1` → locked with ELO message; active session → locked with session message

**Key files:**
```
components/modals/PendingResultSheet.tsx   ← badgeFor/headlineFor/ctaLabelFor helpers, all 5 pendingType branches
components/sports/DurationInput.tsx        ← extracted from SportMetricInput.tsx, standalone component
components/sports/LevelDots.tsx            ← newPlayer prop, opacity 0.3 for dots 5-10 when newPlayer=true
components/sports/SportMetricInput.tsx     ← DurationInput extracted, DoneToolbar InputAccessoryView added
app/session/[id].tsx                       ← acknowledge mutation, cancellation banner, PB sheet keyboard fix, PB pre-fill
app/(tabs)/profile.tsx                     ← LevelDots newPlayer prop, levelLockedByElo/levelLockedBySession conditions
app/user/[id].tsx                          ← LevelDots newPlayer prop
types/index.ts                             ← pbUpdateSubmitted/sessionAcknowledged on GameParticipant, cancellationReasonInsufficientPlayers on GameSession, all 7 pendingType values
```

**Key notes:**
- `acknowledgeSession` fires on mount via `useEffect` — fires once when session + participant data loads and condition is met
- GRADE_BASED and CANCELLED auto-sessions both use same `sessionAcknowledged` flag
- `DurationInput` uses backfill-from-right digit accumulation; stores total seconds as numeric string
- PB pre-fill: two-effect approach — one on `showPbSheet` change, one on `pbValuesKey` (JSON-serialized PB values) change
- Level lock: `levelLockedByElo = isElo && gamesPlayed >= 1`; `levelLockedBySession = isElo && gamesPlayed === 0 && hasActiveSportSession`; distinct warning messages for each case
- InputAccessoryView IDs: `'duration-input-toolbar'` (DurationInput), `'pb-number-done'` (PB sheet), `'sport-metric-done-toolbar'` (SportMetricInput non-duration)

---

### expo-sdk-57-upgrade — DONE

**What was built:**
- Upgraded Expo SDK 55 → 57 (via 56) to match the Expo Go app version, following Expo's official upgrade walkthrough — RN 0.83.6 → 0.86.2, React 19.2.0 → 19.2.3, `react-native-reanimated` 3 → 4 (pulled in `react-native-worklets` as a new required peer dep), TypeScript 5.9.2 → 6.0.3
- `expo-splash-screen` migrated from the deprecated top-level `app.json` `splash` key to a proper plugin entry
- Fixed all resulting compile errors: `StyleSheet.absoluteFillObject` → `absoluteFill`, `global.css` needs `declare module '*.css'` in `nativewind-env.d.ts`, `Notifications.setNotificationHandler` needs `shouldShowBanner`/`shouldShowList`, `useRef<T>()` no-arg overload removed (must pass `undefined` explicitly), TS6's function-boundary narrowing loss on `session` inside nested functions in `session/[id].tsx` (fixed with a local `const s = session!;` alias)

**Key notes:**
- Production EAS builds are independent of what Expo Go supports — they bundle whatever SDK version is in `package.json`. The upgrade was only needed because Expo Go (dev testing) had moved to SDK 57 and could no longer open an SDK 55 project.
- `expo-doctor` flagged a known Hermes memory regression on `expo@56.0.20` and recommended jumping straight to `expo@^57.0.9` — did that rather than stopping at 56.
- On Windows, in-place `npm install expo@^X` upgrades hit `EBUSY` file-lock errors renaming `node_modules/expo-modules-autolinking`; a clean `rm -rf node_modules && npm install --legacy-peer-deps` avoided this every time.

---

### visual-depth-pass — DONE

**What was built:**
- `lib/theme.ts` — shared design tokens: `screenGradient` (`#F4F5FA` → `#EEF0F6`), `textColors`, `cardStyle` (16px radius, `0,2/0.06/8/elev 3` shadow), `inputStyle` (12px radius, `0,1/0.04/3/elev 1` shadow), `inputFocusedStyle` (purple border + stronger shadow)
- `components/ui/ScreenBackground.tsx` — wraps a screen in the subtle gradient via `expo-linear-gradient`; every screen's `SafeAreaView` background became `transparent` and got wrapped in this
- Applied across Discover, My Games, Create, Profile, Session Detail (+ its Review Teams modal), Login, Register, Onboarding, Public User Profile
- Every text input elevated to white + subtle shadow + real purple focus state (via `onFocus`/`onBlur`, not just "has a value"): Login/Register fields, Profile display-name, Create's title/target-pace/description, `LocationPicker`'s search field, `SportMetricInput`'s number/text fallback, `DurationInput`, Session Detail's score-report and PB-update inputs
- Every card unified to the same shadow/radius: Profile's sport/coach cards, public-profile cards, Session Detail's result-status info panels

**Key files:**
```
lib/theme.ts
components/ui/ScreenBackground.tsx
```

**Key notes:**
- `SessionCard.tsx`'s photo-card shadow was already correct (intentionally slightly stronger for an image card) — left untouched.
- Admin tab kept its existing dark theme — out of scope, never asked for.

---

### haptics-feedback — DONE

**What was built:**
- Installed `expo-haptics`; `lib/haptics.ts` exposes `hapticLight`/`hapticMedium`/`hapticSuccess`/`hapticWarning`/`hapticError` — **all haptic calls must go through these, never import `expo-haptics` directly in a component**
- **Light**: `SportChip` selection (covers Discover filters + "My Level" toggle, Create's sport picker, Profile's Add Sport picker), `SportMetricInput`'s level-dot/grade pickers, Create's grade-range chips, `SportSearchPicker` row taps
- **Medium**: `SessionCard` tap (covers Discover + My Games), `PendingResultSheet`'s "Go to game" CTA, `session/[id].tsx`'s `rebalanceMovePlayer`, Create's submit-button tap
- **Success**: join/leave/report/confirm/accept-counter/PB-submit mutations in `session/[id].tsx`, `createSession` in `create.tsx`, `addSport`/`updateProfile` in `profile.tsx`, register on success
- **Error**: login invalid-credentials, register/create client-side validation failure, `joinGame`/`createSession` `onError` (non-time-conflict branch)
- **Warning**: time-conflict branches of `joinGame`/`createSession` `onError`, the various "teams need at least one player" alerts and the dispute "Send for Review?" confirmation in `session/[id].tsx`, `updateSport`'s `LEVEL_LOCKED_ACTIVE_SESSION` error in `profile.tsx`

**Key files:**
```
lib/haptics.ts
```

**Key notes:**
- Haptics only fire on a physical device via Expo Go — no-op on simulators/emulators (see gotcha above).
- Deliberately skipped the bottom tab bar (`tabBarButton` override risks touching navigation internals) and several mutations not explicitly warranting feedback (`disputeResult`, `rejectEscalate`, `cancelSession`, etc.) — restraint over completeness.

---

### sports-catalog-expansion (mobile) — DONE

**What was built:**
- `lib/sportColors.ts` extended with colours for the ~20 new sports added in the backend's `V29` migration (see `backend/CLAUDE.md`)
- `components/sports/SportSearchPicker.tsx` (new) — search input (elevated style, purple focus) + vertical list grouped by rating type (Competitive / Grade-Based / Performance-Based headers, alphabetical within group), "No sports found" empty state, `hapticLight` on row tap. The list area uses a **fixed `height` (not `maxHeight`)** on its inner `ScrollView` so it doesn't shrink and hide behind the keyboard when a search narrows results down.
- Replaces the horizontal `SportChip` scroller in `profile.tsx`'s Add Sport modal — picking a sport collapses the picker to a compact "selected sport + Change" row, then shows the metric form
- `onboarding/sports.tsx` keeps its multi-select + inline level-stepper/grade-input behaviour, but the 2-column card grid became a single-column grouped list with the same search bar, checkmarks on selected rows, and a proper `InputAccessoryView` Done button

**Key files:**
```
components/sports/SportSearchPicker.tsx
lib/sportColors.ts
app/(tabs)/profile.tsx
app/onboarding/sports.tsx
```

---

### discover-header-crossfade — DONE

**What was built:**
- Fixed the Discover screen's title/subtitle/filter-chip block shifting when the skeleton swapped to the loaded list: it used to render in two structurally different containers (a plain `View` while loading vs. `FlatList`'s `ListHeaderComponent` once loaded). Now it renders exactly once, always mounted, above a separate content area.
- Added a skeleton↔content crossfade: a `contentOpacity` `Animated.Value` fades 0→1 over 250ms (`useNativeDriver: true`) once `showSkeleton` flips false; the skeleton layer uses the inverse interpolation and stays mounted only until the fade finishes (so its shimmer loop doesn't run forever or cut off mid-fade).

**Key files:**
```
app/(tabs)/discover.tsx
```

**Key notes:**
- `useMinLoadingTime` (min 700ms skeleton) is unchanged — the fade only starts once it genuinely flips `showSkeleton` false, so no flicker.
- The empty state (`ListEmptyComponent`) is inside the same `FlatList` that's wrapped in the fading `Animated.View`, so it inherits the crossfade automatically.

---

### pending-result-sheet-sync-fix — DONE (bug fixes to `pending-result-sheet` / `post-session-reminders`)

**What was fixed:**
- Root cause of "PB update / session ack doesn't clear the reminder": `markPbSubmitted` and `savePbResults` in `session/[id].tsx` were missing `invalidateQueries({ queryKey: ['pending-results'] })` entirely (the ELO paths already had it).
- Added a shared `removeFromPendingResults()` (via `onMutate`, optimistic `setQueryData` filter) across every resolving mutation — report/confirm/dispute/reject-escalate/accept-counter/PB-submit/acknowledge — so the sheet/banner updates instantly instead of waiting on the next 60s poll.
- `_layout.tsx` force-closes the sheet if it's open with zero pending items left (covers the case where the last item is resolved from inside the session detail screen while the sheet happens to be open).
- Perf: `PendingResultSheet`'s `translateY`/`backdropOpa`/`ctaScale` animations switched from `useNativeDriver: false` to `true`; the component is wrapped in `React.memo` with a content-aware comparator so the 60s `pending-results` poll doesn't force pointless re-renders.

**Key files:**
```
app/session/[id].tsx
app/_layout.tsx
components/modals/PendingResultSheet.tsx
```

---

## What NOT to Build Yet

Coach booking/payment, social feed, ELO history screen, leaderboard screen, search/filter by sport on profile.
