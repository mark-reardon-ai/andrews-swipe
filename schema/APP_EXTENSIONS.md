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

- The app never writes `favorites` (no heart/favorite step). Review edits set `revisited: true`.

- Answer `x_removed` maps undone card IDs to ISO timestamps. Local, remote and Apps Script merges suppress answers at or before that timestamp, preventing undo from being resurrected by sync. A newer replacement answer supersedes it.

## Rounds manifest

`rounds.schema.json` defines this app-owned format. `public/rounds.json` is fetched without cache, relative to BASE_URL, so the same bookmark follows `current` forever. Round IDs must be unique and `current` must name an entry. `deck` resolves relative to the app base. `published` is an ISO datetime, `status` is open/closed, and `session_size` defaults to 20. A closed entry is historical; publishers should set current to an open round. Empty/omitted `answers_endpoint` means local only. Otherwise supply a deployed Google Apps Script URL. `?deck=<url>` overrides deck selection for testing; `?who=tom|jane|both` bypasses the picker.

Completion checks the manifest every 60 seconds and on focus/visibility changes. A changed current round offers a button; it never discards the previous round's local answers. Completion shows what you loved, your A/B picks, review, and cross-person comparisons. The admin workshop is at `#/admin`; optional manifest `admin_key` is a casual lock, not security.

## Storage and hosting

CompositeStore writes local first, then queues remote writes. AppsScriptStore keeps the latest whole file per deck/person in a durable localStorage outbox, retries on next answer/online/focus/visibility, and merges remote and local answers by newest `at`. Remote clear only clears pending sends; it does not delete published sheet rows. Every localStorage operation uses a memory fallback. If browser storage is unavailable and the device is offline, memory lasts only for this page session; export answers before leaving. No browser app can guarantee durability in that case.

Deploy the static build in any subfolder. Set OG_BASE to the absolute hosting URL (including its trailing slash) at build time for Open Graph/Twitter previews. PNG icons are generated with Python Pillow using scripts/make-icons.py. No service worker or offline image cache is installed.

## Workshop exports

Bundles use `{format:"31andrews.swipe_bundle/1", exported_at, deck_id, round, files, conflicts}`. Each conflict has `card_id` and the differing answers with app-person labels. CSV columns are `question,person,value,strength,note,at,channel,recorded_by,joint` (strength and note cells are empty); question is the card ID and channel is `swipe_app`. Joint rows use person `other`, recorded_by `other`, and joint `true`. Individual rows record their participant.

## Test runs and reset

`?who=mark` always selects test mode. `?test=1` can rehearse Tom, Jane, or Together using `who=tom|jane|both`; its picker also offers Mark. Test files have `x_test: true`, and filenames are `<deck_id>.<person>.TEST.json`. Mark uses the existing schema person `mark`. Test answer keys are `31andrews.swipe.TEST.<round>.<deck_id>.<app-person>`; the durable outbox and home hint also have separate TEST namespaces. Real progress is never loaded into a test run.

The sync POST includes `test`, `round`, `total_cards`, `round_complete`, and `loved_questions` (card ID to question, capped at 240 characters). These transport fields support completion email; `x_test` remains the answer-file marker. Apps Script separates `answers_test`/`files_test`, and GET uses `test=1`. Mark is treated as test server-side too. Notification identity is deck ID + app person + test flag in `notified`.

`?reset=1&key=<admin_key>` validates the manifest key before clearing test local keys and posting `{action:"reset_test",key}` when configured. Apps Script independently checks Script Property `ADMIN_KEY`. `&all=1` offers an explicit button and confirmation to clear real local Tom/Jane/Together progress and pending sends as well. Neither real reset control deletes Sheet data. Without a matching nonempty manifest key the shortcut shows “Ask Mark for help”.

## Two-action cards and answers

The app offers swipe left or right only. It never writes swipe `"skip"`, `note`, or
`strength`, although the official schema still permits them. Legacy skip answers
are silently dropped on local/remote/import load, leaving those cards unanswered;
legacy note and strength fields are ignored and removed. `detail` is ignored on
the Tom/Jane card screen; the workshop may display it.

`card.x_ab: {left: string, right: string}` supplies two nonempty labels and requires
`image.file_b`. On kind `compare`, the top image is `image.file` (left label), and
the bottom is `image.file_b` (right label). Left writes `swipe: "no", x_pick: "a"`;
right writes `swipe: "yes", x_pick: "b"`. Compare cards without `x_ab` use the
usual Nope / Love it actions. A/B choices are excluded from loved lists and POST
`loved_questions`; comparisons use their option labels. CSV retains its established
columns, with empty strength and note cells.
