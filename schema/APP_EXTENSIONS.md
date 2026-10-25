# App extensions

The official deck and answer schemas are unchanged and permit additional properties.

- `card.image.x_webp?: Record<string,string>` maps positive pixel widths to paths relative to the deck (for example `{"720":"img/foo-720.webp"}`). The app resolves these into `srcset`, uses `sizes="100vw"`, and retains `image.file` as fallback.
- `card.image.x_webp_b?: Record<string,string>` supplies responsive WebP paths for `image.file_b`, using the same width keys and deck-relative resolution as `x_webp`.
- `card.image.fit?: "cover" | "contain"` defaults to cover. Drawings and plans should use contain.
- A card's section is the first nonempty `section:<name>` option tag, falling back to `kind`.
- Optional deck `session_size` is a positive integer fallback; the manifest's session size takes precedence, then 20.
- Joint answers use official `person: "other"`, plus `x_joint: true`, `x_people: ["tom","jane"]`. Internally the person is `both`, including storage and export filenames `<deck_id>.both.json`. Reconciliation proposal: add `both` to the common schema's person enum.
- Answer `x_round` preserves the round ID. Local keys are `31andrews.swipe.<round>.<deck_id>.<app-person>`; the unscoped adapter also supports the original `31andrews.swipe.<deck_id>.<app-person>` contract.
- Answer `x_sessions` is an array of `{started: ISO datetime, finished?: ISO datetime, cards: string[]}`. It records each sitting, closes on a session boundary, and starts a new sitting on reload/person change. Top-level session starts at the first answer ever and finishes only when every card has an answer. Undo removes the answer and restores prior session data where available.

- Answer `x_removed` maps undone card IDs to ISO timestamps. Local, remote and Apps Script merges suppress answers at or before that timestamp, preventing undo from being resurrected by sync. A newer replacement answer supersedes it.

## Rounds manifest

`rounds.schema.json` defines this app-owned format. `public/rounds.json` is fetched without cache, relative to BASE_URL, so the same bookmark follows `current` forever. Round IDs must be unique and `current` must name an entry. `deck` resolves relative to the app base. `published` is an ISO datetime, `status` is open/closed, and `session_size` defaults to 20. A closed entry is historical; publishers should set current to an open round. Empty/omitted `answers_endpoint` means local only. Otherwise supply a deployed Google Apps Script URL. `?deck=<url>` overrides deck selection for testing; `?who=tom|jane|both` bypasses the picker.

Completion checks the manifest every 60 seconds and on focus/visibility changes. A changed current round offers a button; it never discards the previous round's local answers. Loved-card summary and admin tools have explicit placeholders for later steps.

## Storage and hosting

CompositeStore writes local first, then queues remote writes. AppsScriptStore keeps the latest whole file per deck/person in a durable localStorage outbox, retries on next answer/online/focus/visibility, and merges remote and local answers by newest `at`. Remote clear only clears pending sends; it does not delete published sheet rows. Every localStorage operation uses a memory fallback. If browser storage is unavailable and the device is offline, memory lasts only for this page session; export answers before leaving. No browser app can guarantee durability in that case.

Deploy the static build in any subfolder. Replace relative Open Graph/Twitter image URLs with absolute hosting URLs before sharing. SVG icons are provided now; use scripts/make-icons.mjs as the optional starting point for PNG icon generation later. No service worker or offline image cache is installed.
