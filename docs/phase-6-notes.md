# Phase 6 — the widget and notifications

Continues `phase-4-notes.md`. Rules that must never be broken live in
`AGENTS.md`; setup lives in `README.md`. This file is state and reasoning.

Everything marked verified was seen on a running Android emulator against the
real Supabase project and the real OCR service. What was not seen is listed as
not seen — this file is the record of which is which.

## Built

| What | Where |
| --- | --- |
| Slip-saved notification, both save paths | `src/features/notifications/` |
| Home-screen widget, 4×2 | `src/widgets/` |
| Shared month summary | `src/features/transactions/summary.ts` |
| Widget/notification registration before the app mounts | `index.js` |
| notifee maven repo, notification icon | `plugins/` |

`summarise()` used to live inside the home screen. The widget and the home
screen must never disagree about what this month cost, so it moved out and both
import it.

## Two library traps, neither in the Expo docs

**notifee's Android core never resolves under Expo autolinking.** notifee ships
its core as a bundled maven repo inside the package and registers it from its
own `build.gradle` via `rootProject.allprojects`. That never reaches `:app`
here, so `app.notifee:core:+` fails to resolve and the build dies at
`processDebugResources` having searched only google/maven-central/jitpack. The
fix is the repo in the root `build.gradle`, applied by
`plugins/with-notifee-maven.js` — a config plugin, because `android/` is
regenerated on every prebuild.

**`reactCompiler` breaks any widget component.** react-native-android-widget
does not run a React renderer; it walks the returned element tree to build
RemoteViews. The compiler rewrites components to use hooks internally, so a
compiled one throws `Invalid Hook Call` and the widget renders empty — with the
error only in logcat, never on screen. `src/widgets/expense-widget.tsx` carries
`'use no memo'` for that reason. Any new widget component needs the same line.

## Decisions worth knowing before changing things

**The widget is a breakdown, not a headline.** The canvas
(`design/Notification.dc.html`) drew the card at its content height with a full
month of data. A real 4×2 cell is a fixed box, so on a quiet month that layout
left half the panel blank. Category rows under the bar fill it and answer
"where did it go" without opening the app. They lead with the uncategorised
bucket because `slices` already orders it first — no special case.

**Quick-pick categories are the user's own recent picks, not a guess.**
`recentCategoryPicks()` reads the two most recently confirmed categories. It
deliberately does not predict what `transactions_auto_categorise` would assign;
`AGENTS.md` forbids duplicating the trigger's keyword logic, and a wrong guess
on a notification is worse than none.

**The notification action patches both fields.** `handleNotificationEvent`
sends `category_id` and `is_confirmed: true` together, the same requirement as
`useConfirmCategory` — `transactions_learn_category` fires on that exact
combination and on nothing else.

**The settings toggle needs the OS as well as the row.**
`user_settings.notification_enabled` is intent; `POST_NOTIFICATIONS` is whether
Android will deliver. On a fresh install they disagree, and reading the row
alone showed the toggle on while every notification was dropped. Both now have
to agree, and refusing the prompt leaves the toggle off.

## Verified on device

- The widget renders, and reloads itself on `WIDGET_ADDED` / `WIDGET_UPDATE`
  using the session the shared Supabase client restored from SecureStore — a
  headless render with no React tree and no React Query cache.
- A K PLUS slip (`฿149.00`) that the trigger categorised produced
  `บันทึกแล้ว ฿149.00 · สุขภาพ`, on the `slip-saved` channel, with the
  monochrome status-bar icon rather than the white blob notifee falls back to.
- A UOB slip (`฿421.71`) matching no keyword produced
  `บันทึกแล้ว ฿421.71 · ยังไม่มีหมวด`.
- Tapping that notification deep-linked to `/pending` with the item showing —
  the `EventType.PRESS` path through `Linking.openURL`.
- Re-saving a slip already stored showed no notification, which is the 409 path
  behaving correctly: `status === 'duplicate'` never notifies.
- The permission prompt fires from the settings toggle, and granting it flips
  `POST_NOTIFICATIONS` to `granted=true`.

## Not seen on a device yet

- **The quick-pick action buttons.** Only the uncategorised notification's title
  was confirmed. Neither the buttons themselves nor `ACTION_PRESS` writing
  `category_id` + `is_confirmed` has been exercised.
- **`onBackgroundEvent`** — an action tapped with the app killed. This is the
  whole reason `index.js` exists.
- **The queue path's notification.** Only the review screen's save was driven;
  `flushQueue` calls the same function but was not run.
- **The total moving on save.** Every test slip is dated August 2026 and the
  widget shows the current month, so a save never changed the number on screen.
  A temporary edit pointing `loadWidgetData` at August did show the populated
  layout, and was reverted.

## Still open from phase 4

Unchanged: `.env` points at `10.0.2.2:8000` (emulator only), the Windows
firewall has no rule for the backend's venv interpreter on TCP 8000, the OCR
service has no authentication, `expensetracker://auth/callback` is not in the
Supabase redirect allowlist, Facebook sign-in is not set up, and Node 24.2 is
below what React Native 0.86 declares.

The emulator also needs `-dns-server 8.8.8.8,8.8.4.4` or Google sign-in fails
to resolve accounts.google.com.
