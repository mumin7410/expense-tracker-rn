# สลิปสรุป — mobile app

React Native + Expo (SDK 57), Android only. Reads Thai bank transfer slips, sends
them to the OCR service, and stores the result in Supabase.

This is phase 4 of a four-part project. The other two pieces live elsewhere:

| Piece | Repo | What it does |
| --- | --- | --- |
| OCR service | `expense-tracker-backend` | FastAPI + pytesseract. Image in, parsed JSON out. |
| Database + auth | Supabase cloud (Singapore) | Postgres with RLS, Google sign-in |
| This app | here | The only thing that talks to both |

The OCR service has no Supabase dependency at all — the app is the join. It posts
an image to OCR, then inserts the returned fields into Supabase itself.

Read `../expense-tracker-backend/docs/phase-4-handoff.md` before changing anything
about the data flow. Every constraint below is measured against nine real slips
from four banks, not assumed.

## Setup

```bash
npm install
cp .env.example .env      # then fill in the anon key
npx expo prebuild --platform android
npx expo run:android
```

Requires JDK 17, the Android SDK, and **Node 20.19+, 22.13+, or 24.3+**. Node
24.2 bundles fine but is below what React Native 0.86 declares, so upgrade before
trusting a release build.

`android/` is generated and gitignored. Native code for the screenshot listener
belongs in a **local Expo module** (`npx create-expo-module --local`) rather than
edits inside `android/`, which `prebuild --clean` would throw away.

## Design

`design/` holds the approved design canvas — one `.dc.html` per screen plus
`canvas.json`. `src/theme/tokens.ts` is the port of those values into React
Native; the canvas is authored in oklch, so regenerate the hex rather than
hand-tuning it, or the two drift apart.

## Rules the database enforces, so the app must not

Triggers in Postgres already do these. Doing them here as well causes conflicts:

- **Do not send `dedup_key`.** A trigger overwrites whatever is sent.
- **Do not guess a category.** `transactions_auto_categorise` runs on insert.
- **Do not write `recipient_category_map`.** A trigger writes it on confirm.
- **Do not create `user_settings`.** A trigger creates it at signup.

Always send `raw_ocr_text`. It is the only way to work out why a slip parsed
wrong, and the raw material for supporting a new bank.

## Two things that are easy to get wrong

**Confirming a category needs both fields.** Patch `category_id` *and*
`is_confirmed: true` in the same request. The learning trigger fires on
`when (new.is_confirmed and new.category_id is not null)` — set the category
alone and the app silently stops learning.

**HTTP 409 on insert means success.** It is the unique violation on
`(user_id, dedup_key)`, i.e. this slip is already saved. Drop it from the queue
instead of retrying. No need to check for duplicates before sending.

## What OCR gets wrong, and why the UI accounts for it

Bold Thai recipient names come back mangled and cannot be fixed in the parser:

| On the slip | What OCR reads |
| --- | --- |
| `ทีทีบี` | `nnd` |
| `ทรู มันนี่` | `wy Ng มันนี่` |
| `ยูโอบี/TMRW` | `glad/TMRW uiataas` |

Latin names are exact. So `recipient_name` is always editable, never presented as
settled fact — while auto-categorising keys on `recipient_account`, which is
digits and always reads correctly.

Timing, for choosing timeouts: ttb and UOB about 1.0–1.5 s, SCB about 4.3 s,
K PLUS about 5.5 s. Never set the OCR timeout below 15 s.

Of the OCR error codes, only `503` is worth retrying. `400`, `413` and `415` mean
the image itself is the problem.

## Known gaps

- `expensetracker://auth/callback` is **not** in the Supabase redirect allowlist
  yet. Until it is, Google sign-in bounces to `site_url` and looks like a broken
  deep link when the config is what is broken.
- The OCR service has no authentication.
- Facebook sign-in is not set up. Google is.
