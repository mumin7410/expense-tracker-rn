# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

This file is loaded into every session. It holds only the rules that are
expensive to rediscover — the ones already paid for once. Background, status
and reasoning live in `README.md` and `docs/phase-4-notes.md`.

Stack: Expo SDK 57, React Native 0.86, React 19.2, TypeScript, Android only.
Routes are under `src/app` (not `app/`).

## Database rules — Postgres triggers own these

Doing any of them in the app conflicts with a trigger:

- **Never send `dedup_key`.** `set_transaction_dedup_key()` overwrites it.
- **Never guess a category.** `transactions_auto_categorise` runs on insert.
  This also rules out previewing a guess in the UI: duplicating the keyword
  logic here means the user can see one category before saving and get another
  after.
- **Never write `recipient_category_map`.** A trigger writes it on confirm.
- **Never insert `user_settings`.** `handle_new_user()` creates the row at
  signup; the app only reads and updates it.
- **Always send `raw_ocr_text`.** It is the only way to debug a bad parse.

**Confirming a category must patch `category_id` and `is_confirmed: true` in
one request.** `transactions_learn_category` fires
`when (new.is_confirmed and new.category_id is not null)`. Set the category
alone and the screen looks right while the app silently stops learning.
`useConfirmCategory` is the only correct path.

**HTTP 409 on insert means success**, not failure — the unique index on
`(user_id, dedup_key)` says the slip is already stored. Drop it from the queue,
do not retry, do not show an error.

## React Native 0.86 traps, each hit for real in this repo

- **`elevation` on a translucent view paints an opaque rectangle.** Android
  fills the outline before drawing the shadow, so every glass panel came out
  with a white block behind its text. Use `boxShadow` (supported in 0.86); the
  presets are in `src/theme/tokens.ts`.
- **Thai text is clipped without an explicit `lineHeight`.** Thai stacks a tone
  mark above an upper vowel; a line box sized for Latin cuts the top off words
  like `รอจัดหมวด`, silently. Every entry in `type` carries `lineHeight` and
  `includeFontPadding`. Never spread one and override `lineHeight` smaller.
- **`FormData` no longer accepts `{uri, name, type}`.** It throws
  `Unsupported FormDataPart implementation`, which surfaces as a generic fetch
  rejection that reads exactly like an unreachable server. Use
  `new File(uri)` from `expo-file-system` — it implements `Blob`.
- **`StyleSheet.absoluteFillObject` is gone.** Use `StyleSheet.absoluteFill`.
- **Spreading props after `style=` drops the style.** A `style` key in the
  spread wins even when it holds `undefined`. Put the spread first.

## expo-router 57

It no longer uses `@react-navigation`. For the headless tabs in
`src/app/(tabs)/_layout.tsx`: `parseTriggersFromChildren` walks only Fragments
and `TabList`, and `asChild` unwraps exactly one element. So `TabList` must be
a **direct child of `Tabs`**, and the `TabTrigger`s direct children of the
element it wraps. Wrapping either in a layout `View` leaves the navigator with
no screens and it throws.

## Design

`design/` holds the approved canvas, one `.dc.html` per screen.
`src/theme/tokens.ts` is its port into React Native — the canvas is authored in
oklch, so **regenerate the hex rather than hand-tuning it**, or the two drift.

No blur on Android glass. `expo-blur` needs a `blurTarget` ref that a card
nested inside the blurred content cannot have, and the backdrop is a smooth
gradient anyway — blurring it returns the same pixels. Translucency plus a
bright edge is what reads as glass.

## Native code

`android/` is generated and gitignored. Native work for the screenshot listener
belongs in a **local Expo module** (`npx create-expo-module --local`), never in
edits under `android/` — `prebuild --clean` discards those.
