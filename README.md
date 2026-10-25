# 31 Andrews: Kitchen Choices

A private, phone-friendly kitchen picture picker for Tom and Jane. Swipe left or right
to pick Nope / Love it or choose between two pictures, then compare choices in Mark’s workshop.

Run locally:

```sh
npm install && npm run dev
```

Build and preview:

```sh
npm run build && npm run preview
```

Run checks with `npm test`.

Participant links use `?who=tom`, `?who=jane`, or `?who=both`.
Mark’s admin is `#/admin`; the sample link is `?key=cape1941#/admin`.
The manifest’s `admin_key` is a casual lock, **not a secret or security boundary**.
Copy links in the workshop includes the key in the admin URL.

Decks and answer files follow the JSON formats in [schema/](schema/).
See [APP_EXTENSIONS.md](schema/APP_EXTENSIONS.md) for rounds, joint answers,
sessions, responsive images, favorites, and merge behavior.

Save adapters live in `src/storage/`: LocalStorageStore saves per round, deck,
and person; AppsScriptStore keeps a durable outbox and retries remote sends;
CompositeStore saves locally first and merges newer remote answers.
An empty `answers_endpoint` in `public/rounds.json` means local-only saving.
Export files to move answers between devices. Browser storage is not a backup.

Follow [Publishing rounds](docs/PUBLISHING.md) to validate and publish decks.
For optional Google Sheets sync, follow [Apps Script setup](apps-script/README.md).

## GitHub Pages

Hosted from the `gh-pages` branch of `mark-reardon-ai/andrews-swipe` (public repo, not linked anywhere).
Deploy with one command from this folder (uses the box's `gh` git login; no tokens in the repo):

    npm run deploy        # = scripts/deploy-gh-pages.sh mark-reardon-ai andrews-swipe

It runs the unit tests, builds with `OG_BASE=https://mark-reardon-ai.github.io/andrews-swipe/`
(absolute og:image/og:url for iMessage link previews), and force-pushes `dist/` to `gh-pages`.
Pages source: branch `gh-pages`, folder `/`.

A GitHub Actions alternative is in `docs/pages-workflow.example.yml`. It is not active because
the box's GitHub token has no `workflow` scope (pushing files under .github/workflows is refused).
To use it: `gh auth refresh -s workflow`, move it to `.github/workflows/pages.yml`, and set Pages
source to "GitHub Actions".

Noindex metadata and robots.txt discourage indexing; they do not restrict access.
Regenerate the Cape house PNG icons with `python3 scripts/make-icons.py`
(requires Pillow). No service worker or offline picture cache is installed.

## Before Tom and Jane start

1. Configure optional Sheet sync and Script Properties `NOTIFY_EMAIL` and `ADMIN_KEY` using [Apps Script setup](apps-script/README.md).
2. Do a full sample run yourself at `?who=mark`; check the `[TEST] Mark finished Round 1 (R01)` email and test Sheet tabs.
3. Open `?reset=1&key=<admin_key>` to clear test data on this phone and in the Sheet. Tap **Start fresh** afterward.
4. If rehearsing on their phones used real links, use `?reset=1&key=<admin_key>&all=1` and explicitly confirm clearing real progress on each phone. This leaves the Sheet unchanged. Prefer test links for rehearsals.
5. Send the per-person links: `?who=tom` and `?who=jane`, or `?who=both` for Together.

More test links: `?test=1`, `?test=1&who=tom`, `?test=1&who=jane`, and `?test=1&who=both`. Test progress and exports stay separate from real answers. Mark’s workshop offers these links, **Reset test data**, and a separate **Reset real progress on this phone** control with person/all choices and two confirmations. A reset shortcut with the wrong key only shows “Ask Mark for help”.
