# TIME BOXING FOR KIDS
## FINAL PRODUCT & TECHNICAL SPECIFICATION

Version: 1.0 (implementation: Phase 1)
Status: Approved for Development
Platform: Static Web Application
Deployment: GitHub Pages
Language: Indonesian
Target: Children and Parents

---

# 1. PRODUCT VISION

Build a very simple family time-boxing application.

The application allows parents and children to see, organize, and coordinate their daily activities in one shared visual timeline.

The application must be easy enough for children to operate independently.

Three fundamental principles:

1. SIMPLE: No complicated menus, forms, or workflows.
2. VISUAL: Activities are represented by colorful draggable time blocks.
3. SHARED: All family members can see each other's schedules and identify conflicts.

Do not turn this application into a project management system.

# 2. APPROVED DESIGN DECISIONS

These decisions are final and must be followed.

## 2.1 Calendar Layout: LAYERS

Use ONE shared vertical timeline.

Do NOT create permanent columns for each family member.

All activities appear on the same timeline, with profile colors and visual identifiers.

When events overlap in time, automatically arrange them horizontally into temporary side-by-side lanes so that they remain visible.

These lanes are only a visual arrangement mechanism, NOT separate profile columns.

Example:

08:00–09:00
- Blue block: Child 1 — School preparation
- Green block: Child 2 — Reading
- Orange block: Father — Work

All three blocks appear in the same shared calendar area.

When a profile is hidden, its events are hidden from the calendar but remain stored.

When a profile is shown again, its events return.

Shared events must appear only ONCE.

Example:
"Reading Quran Together"

Participants:
- Father
- Child 1

Represent this as one event block with both profile identifiers.

## 2.2 Prayer Calculation: KEMENAG

Use Kemenag/SIHAT as the reference standard.

The application must calculate prayer times locally.

Do not depend on a paid API or a server-side service.

Prayer calculation parameters must be documented and verified against official Kemenag references.

Do not claim that the calculation is an MUI method.

## 2.3 Data Storage: MANUAL TRANSFER

Use LocalStorage.

Provide:

- Export family data to JSON.
- Import family data from JSON.
- Full backup and restore.

No automatic cloud synchronization.

No login.

No user accounts.

No online database.

The same JSON backup can be transferred between phones, tablets, and computers manually.

Importing a backup must show a confirmation before replacing existing data.

The application must warn users that browser storage is local to each device.

# 3. FAMILY PROFILES

Support an arbitrary number of family members.

Default example:

- Father
- Mother
- Child 1
- Child 2
- Child 3

Profile properties:

- id
- name
- emoji
- color
- visible
- createdAt

Features:

- Create profile.
- Edit profile.
- Delete profile with confirmation.
- Show/hide individual profiles.
- Show all profiles.
- Hide all profiles.

Profile visibility is a display preference, not a deletion mechanism.

Profile colors must remain visually distinguishable.

# 4. MAIN INTERFACE

Use a clean and playful interface.

Main navigation:

- Day
- Week
- Month
- Profiles
- Settings

Main calendar header:

- Current date
- Previous date
- Next date
- Today button
- View selector
- Zoom controls

Profile selector:

Display colored profile chips.

Clicking a chip toggles its visibility.

Keep the profile selector accessible without opening another page.

# 5. DAILY TIMELINE

The daily timeline is the primary application interface.

Requirements:

- Vertical time axis.
- One shared calendar canvas.
- Color-coded activity blocks.
- Automatic horizontal positioning for overlapping events.
- Current-time indicator.
- Prayer-time markers.
- Vertical scrolling.
- Adjustable visible time range.

Default visible time range can be configured.

Use a 24-hour time format.

Allow users to navigate to previous and future dates.

## Overlapping layout algorithm

Implement an interval-based layout algorithm.

For every visible event:

1. Determine its start and end.
2. Identify other events that overlap.
3. Group overlapping events into visual clusters.
4. Assign horizontal lanes.
5. Calculate block width and horizontal position.
6. Recalculate positions when events are created, moved, resized, hidden, or deleted.

Use the minimum number of lanes necessary.

Do not confuse visual lane assignment with family profile ownership.

A shared event remains a single event even when it has multiple participants.

# 6. TIME BLOCK INTERACTIONS

This is the highest-priority feature.

Use direct manipulation.

## CREATE

Click or tap an empty timeline area.
Immediately create a temporary event block.

Do not open a modal.

Defaults:

- Title: New Activity
- Duration: 30 minutes
- Snap interval: 10 minutes

Allow the user to resize or move the temporary block immediately.

## MOVE

Drag the center of an event block.

Movement changes its start and end while preserving duration.

## RESIZE

Provide top and bottom resize handles.

Top handle: changes event start.

Bottom handle: changes event end.

## SNAP

Default interval: 10 minutes.
Minimum duration: 10 minutes.
Default duration: 30 minutes.

## EDIT

Click the title or edit icon.

Open a lightweight editor.

Fields:

- Activity title.
- Participating profiles.
- Optional notes.

Save and Delete actions.

Avoid unnecessary fields.

## TOUCHSCREEN

Use Pointer Events API.

Support Android Chrome, tablets, mouse, and stylus.

Use large touch targets, preferably at least 44px.

Prevent accidental page scrolling during active calendar gestures.

Normal page scrolling must remain available outside the interaction area.

Provide visual feedback while dragging and resizing.

Dragging must not accidentally trigger the edit action.

# 7. CONFLICT DETECTION

Detect conflicts based on shared participants.

An event conflicts with another event when:

- Their time intervals overlap.
- They share at least one profile ID.
- They are not the same event.

Different family members can have simultaneous activities without conflict.

Shared events must not conflict with themselves.

Conflict warnings should be visual and non-blocking.

Do not automatically reject or delete overlapping events.

Recalculate conflicts whenever events change.

# 8. CALENDAR NAVIGATION

## DAILY

Detailed time-blocking interface.

## WEEKLY

Show seven days.
Display activity indicators and allow selection of any day.
Clicking a day opens its daily view.

## MONTHLY

Show:

- Date.
- Event count or indicators.
- Profile colors.
- Special-day indicators.

Clicking a date opens its daily view.

Allow users to create custom special days and holidays.

Do not require an external calendar API.

# 9. ZOOM AND TIME RANGE

Provide simple zoom controls.

Zoom changes the visible time scale, not the actual event duration.

Support:

- Full-day view.
- Morning.
- Afternoon.
- Evening.
- Custom visible time range.

Maintain 10-minute snapping regardless of zoom.

Ensure event blocks remain sufficiently large for touch interaction.

# 10. PRAYER TIMES

Implement a separate prayer calculation module.

Required times:

- Subuh
- Sunrise
- Zuhur
- Asar
- Magrib
- Isya

## Location

Allow manual selection of location.

Store:

- Location name.
- Latitude.
- Longitude.
- Timezone.
- Elevation when available.

Support WIB, WITA, and WIT.

Default location should be configurable by the user.

Do not require GPS permission.

## Calculation

Use verified Kemenag/SIHAT calculation references.

Document the exact calculation parameters.

Support configurable parameters where applicable:

- Fajr angle.
- Isha angle.
- Asr shadow factor.
- Elevation correction.
- Ihtiyati adjustment.
- Timezone.

Do not invent parameter values.
Do not hardcode prayer times for one city.
Calculate for the selected date and location.
Use a reliable JavaScript calculation library or a properly tested local implementation.

The application must work without internet after its initial deployment, except for obtaining future software updates.

## Prayer timeline

Prayer markers extend across the shared timeline.
They are special system-generated markers.
They cannot be dragged, resized, or deleted as normal events.
They may be hidden or shown.
Users can create ordinary activities around prayer times.
Allow a configurable visual preparation period before prayer if needed.

Official reference: https://sihat.kemenag.go.id/

If official data is available for comparison, use it to validate calculated results.
Do not claim verified accuracy without testing.

# 11. THEMES

Create four themes:

1. Sky & Mint
2. Candy
3. Lavender
4. Nature

Use CSS variables.
Themes should be colorful, playful, readable, and calm.
Avoid excessive animations and decorative elements.

# 12. DATA MODEL

Family profile: id, name, emoji, color, visible, createdAt.

Event: id, title, start, end, profileIds, note, createdAt, updatedAt.

Special day: id, date, title, type.

Settings: activeTheme, currentView, selectedDate, visibleTimeRange, snapInterval, location, prayerSettings.

Use a consistent local datetime representation.
Avoid accidental timezone conversion when serializing and restoring calendar events.
Use unique IDs.
Implement a data schema version.

# 13. LOCAL STORAGE AND JSON

Use LocalStorage.
Automatically save changes after every successful operation.

Implement:

- Export complete family data.
- Import complete family data.
- Validate imported JSON.
- Confirm before replacing current data.
- Reset application with confirmation.

Use a documented JSON schema.

Export must include profiles, events, special days, and relevant settings.
Do not include temporary UI state.
Import must reject malformed or unsupported data.
Never silently overwrite data.

Display a clear warning:

"Data tersimpan di browser perangkat ini. Untuk memindahkan data ke perangkat lain, gunakan Ekspor dan Impor JSON."

# 14. RESPONSIVE DESIGN

Primary devices:

- Android phones.
- Android tablets.
- Desktop browsers.

Prioritize mobile-first design.
Ensure that the shared timeline remains usable on narrow screens.
Do not make event blocks too narrow or too small to touch.
Horizontal lane overflow must be handled gracefully.
Test on Android Chrome.

# 15. PROJECT STRUCTURE

time-boxing-for-kids/

  index.html
  README.md
  SPEC.md

  css/
    main.css
    themes.css
    calendar.css
    responsive.css

  js/
    app.js
    state.js
    storage.js
    profiles.js
    calendar.js
    time-blocks.js
    drag-resize.js
    layout-engine.js
    conflicts.js
    prayer-times.js
    prayer-settings.js
    navigation.js
    themes.js
    export-import.js

  lib/
    prayer-calculation/

The structure may be adjusted if necessary, but maintain clear module separation.

# 16. DEVELOPMENT PHASES

Build incrementally.

## PHASE 1 — FOUNDATION

- Application shell.
- Family profiles.
- Show/hide profiles.
- Shared timeline layout.
- Themes.
- LocalStorage.

## PHASE 2 — TIME BLOCKING

- Create events.
- Move events.
- Resize events.
- Edit events.
- Delete events.
- 10-minute snapping.
- Touchscreen support.

## PHASE 3 — LAYOUT AND CONFLICTS

- Overlap detection.
- Dynamic horizontal lane assignment.
- Shared events.
- Conflict warnings.
- Profile visibility recalculation.

## PHASE 4 — CALENDAR NAVIGATION

- Daily view.
- Weekly view.
- Monthly view.
- Date navigation.
- Zoom and visible time ranges.
- Special days.

## PHASE 5 — PRAYER TIMES

- Location settings.
- Local calculation.
- Kemenag parameter verification.
- Prayer timeline markers.
- Test against official references.

## PHASE 6 — DATA MANAGEMENT

- JSON export.
- JSON import.
- Validation.
- Backup and restore.
- Data migration.

## PHASE 7 — FINALIZATION

- Responsive optimization.
- Android testing.
- Performance testing.
- README documentation.
- GitHub Pages deployment.

Do not proceed to the next phase until the current phase passes its acceptance tests.

# 17. ACCEPTANCE TESTS

1. Five or more family profiles can be created.
2. Profiles can be independently shown and hidden.
3. All visible profiles share one timeline.
4. Simultaneous events are automatically arranged into visible lanes.
5. One shared event can belong to multiple profiles.
6. Shared events are never duplicated.
7. Events can be created without opening a modal.
8. Events can be moved by dragging.
9. Events can be resized from both ends.
10. Movement snaps to 10-minute intervals.
11. Conflicts are detected based on shared participants.
12. Hiding a profile does not delete its events.
13. Daily, weekly, and monthly views work.
14. Prayer times update when location or date changes.
15. Prayer markers cannot be accidentally moved.
16. Themes can be changed.
17. Data survives browser refresh.
18. JSON export and import work correctly.
19. Application works on Android Chrome.
20. Application deploys successfully to GitHub Pages.
21. No backend, login, or online database is required.

# 18. GITHUB DEPLOYMENT

Repository name: time-boxing-for-kids
Application title: Time Boxing for Kids
Use GitHub Pages.
Ensure all asset and module paths work when deployed under a GitHub repository subpath.
Do not assume the application is hosted at the domain root.
Document deployment instructions in README.md.

# 19. CODING AGENT WORKFLOW

Before coding: inspect the project directory, read the specification, create an implementation plan, identify risks, create SPEC.md, start Phase 1.
During coding: keep it simple, avoid unnecessary dependencies, do not add unrequested features, test every phase, document decisions, never fake prayer results, never report untested features as complete.
After each phase provide: features implemented, files created/modified, tests performed, results, remaining issues.
At the end provide: complete README.md, final SPEC.md, deployment instructions, testing report.

# 20. CRITICAL DEVELOPMENT NOTES & WORKFLOW

## 20.1 LAYERED EVENT LAYOUT ALGORITHM
No event may be completely hidden behind another event. Overlapping blocks remain visible and selectable. Dynamic lane assignment. Recalculate on create, move, resize, delete, hide. Shared events stay a single event. Use the minimum number of lanes. Works on narrow screens. Test 2, 3 and 5 simultaneous activities.

## 20.2 ANDROID TOUCHSCREEN TESTING
Drag and resize must be tested on actual Android touchscreen devices, not only desktop emulation. Test create, move, resize both ends, scroll, profile switching, edit/delete, and accidental-click prevention. Use Pointer Events API. Do not declare drag-and-resize complete before touchscreen testing.

## 20.3 PRAYER TIME CALCULATION VERIFICATION
Document every parameter, identify the authoritative Kemenag/SIHAT reference, verify against official schedules, test multiple dates/locations, document discrepancies. Never invent parameters. Never claim official accuracy without verification. If official reference data is unavailable, document the limitation.

# 21. DEVELOPMENT WORKFLOW — IMPORTANT

Do not build the entire application in one coding session. Build incrementally.
FIRST TASK: PHASE 1 ONLY.

**Final instruction: Do not implement Phase 2 or later until explicitly instructed by the user.**

---

# 22. IMPLEMENTATION NOTES — PHASE 1

These notes document the decisions taken for the Phase 1 build. They are part of the specification for the implementation.

## 22.1 Scope of this build

Implemented: application shell and navigation, family profile CRUD, per-profile visibility, show all / hide all, one shared vertical day timeline, profile-coloured event blocks (shared events rendered once with all participants), current-time indicator, reading of existing events from storage, four themes, LocalStorage persistence with automatic save, a temporary full-screen Focus mode for the calendar, and **Phase 2 direct manipulation (create, move, resize, edit, delete events with 10-minute snapping and Pointer Events touch support).**

Explicitly deferred (per Section 21): overlap lane assignment and conflict warnings (Phase 3); week/month views, special days, zoom and time-range presets (Phase 4); prayer times (Phase 5); JSON export/import and reset (Phase 6). Placeholders are labelled in the UI instead of pretending to work.

## 22.2 Module structure (Phase 1 + 2)

- `js/app.js` — bootstrap, delegated UI events, dialogs, toasts, cross-module wiring.
- `js/state.js` — single in-memory store, save-after-mutation, subscribe/notify.
- `js/storage.js` — LocalStorage read/write, defaults, seed data, schema version, normalization.
- `js/profiles.js` — profile chip bar and Profiles page rendering.
- `js/calendar.js` — shared day timeline rendering, now indicator.
- `js/layout-engine.js` — Phase 1: day bounds and simple single-lane placement (Phase 3 replaces it with the interval lane algorithm).
- `js/navigation.js` — date arithmetic, date label, view switching.
- `js/themes.js` — theme registry and application.
- `js/ui.js` — small helpers: toast, confirm dialog, escape-safe HTML.
- `js/utils.js` — date/time/colour helpers (no timezone conversion).
- `js/event-editor.js` — lightweight editor dialog for one activity (title, participants, notes). Times edited on timeline, not here.
- `js/event-interactions.js` - pointer-based gestures for day timeline: create on empty tap, hold-and-drag to move, handles to resize, tap to edit. Uses Pointer Events; `touch-action: pan-y pinch-zoom` on blocks so a swipe still scrolls.

Files reserved for later phases are not created yet, so no dead code ships.

## 22.3 Datetime representation

All event times are stored as **local wall-clock strings without a timezone**: `YYYY-MM-DDTHH:mm`.

Dates are stored as `YYYY-MM-DD`. No `Date.parse()` of stored values is used; strings are split and reconstructed with `new Date(y, m-1, d, hh, mm)`. This prevents UTC shifting when a backup moves between devices or timezones. 24-hour format everywhere. Phase 1 renders single-day events; an end time equal to `00:00` is clamped to the end of the day for display.

## 22.4 LocalStorage schema

Key: `timeboxing-kids:data`

```json
{
  "schemaVersion": 1,
  "profiles": [
    { "id": "prof_...", "name": "Ayah", "emoji": "👨", "color": "#2F80ED", "visible": true, "createdAt": "2026-11-18T08:00:00.000Z" }
  ],
  "events": [
    { "id": "evt_...", "title": "Sarapan bersama", "start": "2026-11-18T07:00", "end": "2026-11-18T08:00", "profileIds": ["prof_a", "prof_b"], "note": "", "createdAt": "...", "updatedAt": "..." }
  ],
  "specialDays": [],
  "settings": {
    "activeTheme": "sky-mint",
    "currentView": "day",
    "selectedDate": "2026-11-18",
    "visibleTimeRange": { "start": "00:00", "end": "24:00", "preset": "full" },
    "snapInterval": 10,
    "location": { "name": "", "latitude": null, "longitude": null, "timezone": "Asia/Jakarta", "elevation": null },
    "prayerSettings": { "method": "kemenag", "fajrAngle": null, "ishaAngle": null, "asrShadowFactor": null, "elevationCorrection": true, "ihtiyatiMinutes": 0, "showMarkers": true, "preparationMinutes": 0 }
  }
}
```

`createdAt`/`updatedAt` audit timestamps use ISO 8601 UTC because they are metadata, never used for calendar placement. Prayer settings are present as placeholders with `null` values: **no parameter has been invented and no prayer time is calculated in Phase 1.**

On first run the store is seeded with five profiles (Ayah, Ibu, Anak 1–3) and seven sample activities for the current day, including one shared activity with multiple participants. Seed data is written only when the key is absent. If the stored JSON cannot be parsed, the raw text is copied to `timeboxing-kids:data:corrupt-backup` before a fresh store is created, so nothing is silently destroyed.

## 22.5 Shared timeline rules (Phase 1)

- One canvas, no permanent per-profile columns.
- An event is drawn once, no matter how many profiles participate.
- A visible event is drawn when at least one participant profile is visible.
- An event with no participants (possible after deleting a profile) stays visible as a neutral block.
- Hiding all profiles hides all participant events and leaves data untouched.
- Overlaps currently render in a single lane. The lane algorithm is Phase 3, as specified in Section 16.

## 22.6 Theming

CSS custom properties on `[data-theme]` in `css/themes.css`. Themes: `sky-mint`, `candy`, `lavender`, `nature`. Theme choice is stored in settings and applied before first paint by a small inline bootstrap in `index.html` to avoid a flash.

## 22.7 Focus mode (layout enhancement)

A single "Fokus" button in the calendar toolbar toggles a temporary full-screen layout: the app header, calendar toolbar, profile bar, footer and timeline legend are hidden, and the timeline card grows to fill `100dvh` with page scrolling disabled. A compact bar at the top keeps date navigation (‹ ›), "Hari ini", and "Keluar fokus"; `Esc` also exits.

Decision: Focus mode is **temporary UI state**, held in memory only. It is deliberately not written to `settings`, not included in the LocalStorage schema, and not exported. A reload starts unfocused, and switching to the Profiles or Settings page exits Focus mode automatically. Only the calendar views (Day, and later Week/Month) can be focused.

## 22.8 Viewport-locked shell (footer always visible)

The app is a single viewport-height column: `.app` is `height: 100dvh` with `overflow: hidden`, so the document itself never scrolls. The footer sits in normal flow at the bottom of that column instead of being `position: fixed`, so it can never cover timeline content and is always on screen at any browser zoom level.

- `.app-main` is the only scrolling region for the Profiles and Settings pages.
- The day timeline fills the leftover height: `.view`, `.calendar-stage` and `.timeline-card` grow (`flex: 1 1 auto`), and `.timeline-scroll` is `flex: 1` with no pixel `max-height`; scrolling happens inside the timeline card only.
- `.timeline-card` keeps a `min-height` (240 px, 190 px on very short screens). If the chrome cannot fit — very high browser zoom or a short landscape window — `.app-main` scrolls the page area while the footer stays pinned at the bottom of the screen.
- Short viewports (`max-height: 700px / 640px / 560px / 480px`) compress the chrome: brand mark and subtitle shrink, gaps tighten, the profile bar becomes one horizontally scrolling row, the date label stops wrapping, and the hour height drops.
- The toast sits `56px` above the bottom so it clears the footer.

## 22.9 Timeline geometry (hour lines, labels, blocks)

One coordinate system for the whole day: the canvas is exactly 24 × `--hour-height` tall with no top or bottom padding. `.event-layer` covers that same box, so block `top`/`height` percentages map 1:1 to minutes and blocks land exactly between their hour lines.

- Hour labels are `position: absolute` at `top: calc(var(--hour-height) * hour)` inside the gutter; they scroll with the canvas and always sit on their own line, never piling up.
- The grid background starts at `background-position: 0 0`, so the 00:00 line is the very top of the canvas.
- No `padding-bottom` on `.timeline`: the canvas ends at 24:00. The last label (23:00) stays reachable because the 23:00–24:00 row still scrolls into view.
- Tap-to-create uses `canvas.getBoundingClientRect().height` (exactly 24 hours), so a tap lands on the minute it points at.

## 22.10 Phase 2 — Time Blocking (direct manipulation)

**New modules:**
- `js/event-editor.js` — lightweight editor dialog (title, participants, notes). Times are NOT edited here; they are manipulated directly on the timeline.
- `js/event-interactions.js` — all pointer-based gestures for the day timeline.

**Interaction model (SPEC.md §6):**
- Tap/click empty area on the time canvas → creates a 30-minute block at the snapped time (10-min interval from settings, default 10). Minimum duration 10 min.
- Drag middle of a block → move (preserves duration). Snaps to interval.
- Drag top/bottom resize handle → change start or end. Snaps to interval, enforces 10-min minimum.
- Tap a block or its pencil button → opens event editor dialog (title, participants checkboxes, notes). Save/Delete actions live here.
- All gestures use **Pointer Events** (mouse, touch, pen, stylus). `touch-action: pan-y pinch-zoom` on `.event-block` and `.event-resize`, so a vertical swipe over a block still scrolls the timeline and page pinch-zoom stays available.
- During gesture: block gets `is-gesturing` class (shadow, z-index), resize handles visible, edit button hidden, live time and duration labels update.
- Click suppression: `suppressClickUntil` (500 ms) is set only after a **real** move/resize (or after a swipe is recognised), so a plain tap or mouse click still opens the editor.

**Implementation details:**
- Snap interval read from `settings.snapInterval` (candidates 5, 10, 15, 30; default 10) via `snapMinutes()` in `utils.js`.
- New block ID via `uid('evt')`; times stored as local wall-clock strings `YYYY-MM-DDTHH:mm` (no timezone).
- Updates go through `state.update()` → immediate LocalStorage persist → subscribers re-render.
- Editor dialog (`#eventDialog`) uses the existing confirm/toast infrastructure from `ui.js`.
- No modal for creation — the block appears instantly and is editable in place.

**UI affordances added:**
- Resize handles (`.event-resize-start`, `.event-resize-end`) appear on hover and during gesture.
- Edit button (`.event-edit`, pencil icon) top-right of each block.
- Duration label inside each block: `.event-duration-inline` after the time range for blocks ≥ 60 min, `.event-duration-chip` beside the title for compact blocks (< 60 min, where the time line is hidden). Format: `30 mnt`, `1 j`, `1 j 30 mnt`.
- Legend hint: "Ketuk area kosong untuk menambah · tahan blok untuk memindah".
- Empty-day notice changed to prompt creation: "Ketuk area kosong di timeline untuk membuat kegiatan 30 menit."

## 22.11 Gesture arbitration (swipe vs. hold)

The first Phase 2 build started a drag as soon as the finger moved 12 px, so scrolling the timeline by swiping over a block moved the block instead. The revised model separates the two intents:

| Pointer | Down | Move before hold completes | Hold completes (380 ms) | Move after hold | Release |
| --- | --- | --- | --- | --- | --- |
| Touch / pen | starts a 380 ms timer, no visual change | > 10 px travel → **swipe**: timer cancelled, native scroll takes over, click suppressed 400 ms | `is-gesturing` armed (+10 ms vibration), `touchmove` made non-passive and cancelled | block follows the finger vertically, snapped to the interval | saves once, then suppresses the click 500 ms |
| Mouse | armed immediately | — | — | same as above | same as above |

Implementation notes:
- `LONG_PRESS_TOLERANCE_PX = 10` (a swipe) and `LONG_PRESS_DELAY_MS = 380` (a hold) in `js/event-interactions.js`; `DRAG_THRESHOLD_PX = 8` is the dead zone after the hold so the block does not jump on the first snapped step.
- The drag anchors at the activation point and only then applies `deltaY`, so the first move event cannot shift the block.
- A fast flick that arrives as one coalesced move is handled on `pointerup`: the pending delta is applied before saving.
- While a drag is active, `window` gets a non-passive `touchmove` listener that calls `preventDefault()`, so the page cannot scroll under the finger.
- A native scroll makes the browser fire `pointercancel`; the preview is reset and nothing is saved.
- Pointer listeners live on `window` (filtered by `pointerId`) so the finger may leave the block; pointer capture is requested only once the hold completes, and is best-effort.
- `navigator.vibrate(10)` gives a haptic cue when the hold completes (Android); failures are ignored.

## 22.12 Known risks

1. **Lane algorithm on narrow screens** — Phase 3 must keep blocks >= 44 px wide; planned: minimum lane width with horizontal overflow inside the event layer only.
2. **Prayer-time accuracy** — Phase 5 must document Kemenag parameters and compare against SIHAT output for several cities/dates; results must not be presented as verified before that comparison exists.
3. **LocalStorage capacity** — roughly 5 MB per origin; a few thousand events fit comfortably. Quota failures are surfaced as a toast.
4. **Browser storage is per device** — permanent UI warning plus documented JSON transfer workflow.
5. **Android gesture handling** — Phase 2 requires real-device testing; `touch-action` will be scoped to the interaction surface so page scrolling elsewhere is unaffected.
