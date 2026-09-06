# Phase 4 — what got built, what was verified, what is left

Companion to `../expense-tracker-backend/docs/phase-4-handoff.md`, written from
the app side after the work was done. Rules that must never be broken live in
`AGENTS.md`; setup lives in `README.md`. This file is state and reasoning.

Everything below marked verified was checked on a running Android emulator
against the real Supabase project and the real OCR service, not asserted.

## Built, in order

| Step | What | Verified on device |
| --- | --- | --- |
| 1 | Expo scaffold, design tokens, glass surfaces, tab dock, Thai date/money formatting | yes |
| 2 | Supabase client, Google OAuth, session persistence, route guards | yes |
| 3 | Data layer: month list, pending list, categories, insert, confirm | yes |
| 4 | OCR client and the review screen | yes |
| 5 | Offline queue (SQLite) | yes |
| 6 | Settings on real `user_settings`, all-transactions screen | yes |

## What the device tests actually proved

- Google sign-in completes and the session survives a full app restart, which
  is what shows the chunked SecureStore adapter reads back correctly.
- A real ttb top-up slip parses to the same values the backend fixtures hold
  (`180.00`, `wy Ng มันนี่ [เติมเงิน]`, account `2704`).
- `transactions_auto_categorise` assigned เติมเงิน/วอลเล็ท from the keyword
  `มันนี่` with the app sending no `category_id` at all.
- A UOB slip matching no keyword landed in the pending list, and confirming a
  category cleared it. Settings then showed **ผู้รับที่จำไว้ 1 ราย**, which is
  the visible proof `recipient_category_map` was written.
- Saving the same slip twice left one row and showed no error (the 409 path).
- With airplane mode on, a slip queued; with it off and the app foregrounded,
  the queue ran OCR, inserted, and the row appeared categorised.

## Decisions worth knowing before changing things

**The review screen has no category preview, unlike the canvas.** The canvas
drew a หมวด card with a "เดาจากคำสำคัญ" badge before saving. Building it means
reimplementing the trigger's keyword matching in the app, which `AGENTS.md`
forbids — and if the two ever disagree the user sees one category while
reviewing and a different one after saving. The category comes back on the
insert response, so the honest place to show it immediately is the phase 6
notification.

**The offline queue stores the parse result, not just the image.** A row with
`parsed_json` null still needs OCR; with it set, only the insert is left. A
failed insert therefore never pays for OCR twice, and K PLUS costs about 5.5 s
per attempt.

**The queue distinguishes two kinds of failure.** 400/413/415 are verdicts on
one image and will never change, so that row is dropped rather than left to
block every future pass. 503 or a dead network stops the whole loop
immediately, instead of burning every row's attempt counter on one outage.

**There is no connectivity check.** The OS reporting a network says nothing
about whether the OCR service is reachable. Attempting the request is the only
honest answer, and failing costs one retry later.

**No real blur.** See `AGENTS.md`. The short version: it cannot work for cards
under the current `expo-blur` API, and it would not change the pixels anyway.

## Open, and needed before phase 5 or 6

- **`.env` points at `http://10.0.2.2:8000`**, which only works from the
  Android emulator. A real device needs the machine's LAN IP.
- **Firewall.** Windows matches rules by program path, and the existing `Python`
  rules point at the Store Python, not the backend's `.venv\Scripts\python.exe`.
  So localhost reaches the OCR service and every other device is refused. A real
  device needs an inbound rule for TCP 8000.
- **The OCR service still has no authentication.** The handoff says to add an
  API key header before exposing it. The Wi-Fi in use is classified Public, so
  opening port 8000 without one exposes it to everything on that network. Add
  the key first; the client already funnels every request through one function
  (`parseSlip`), so a header is a small change.
- **Facebook sign-in** is not set up. Google is.
- Node 24.2 is below what React Native 0.86 declares (`^24.3.0`). Metro bundles
  fine but a release build is untested on it.

## Phase 5 and 6 shape

> Both are built. Phase 6 is written up in `phase-6-notes.md`, including which
> parts were verified on a device and which were not. What follows is the plan
> as it stood at the end of phase 4, kept because it records why each piece is
> shaped the way it is.

Both need a native rebuild, not fast refresh, and both are better tested on a
real device than the emulator.

- **Phase 5, screenshot listener**: a local Expo module watching the Screenshots
  folder, plus permissions and a foreground service. It should hand images to
  the existing queue — `enqueue({ imageUri })` is already the entry point and
  needs no parse result.
- **Phase 6, widget and notifications**: `react-native-android-widget` and
  `notifee`. The widget must be drawn flat: RemoteViews cannot blur, so the
  canvas uses solid fills and a colour bar. The total updates on save and does
  not wait for a category to be chosen.
