# 31 Andrews: Kitchen Choices

A private, phone-friendly kitchen picture picker for Tom and Jane. Swipe or tap
Love it, No, or Not sure; add notes and favorites, then compare choices in Mark’s workshop.

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

Enable Pages with **GitHub Actions** as the source. The
[Pages workflow](.github/workflows/pages.yml) installs with `npm ci`, runs tests,
builds, uploads `dist`, and deploys on pushes to `main` or manual runs.
It derives `OG_BASE=https://<user>.github.io/<repo>/` from repository context.
For a custom domain, change OG_BASE to that absolute site URL, including a
trailing slash. Vite replaces `%OG_BASE%` in index.html so image and page
metadata have absolute URLs for iMessage previews. Local builds default to empty.

Noindex metadata and robots.txt discourage indexing; they do not restrict access.
Regenerate the Cape house PNG icons with `python3 scripts/make-icons.py`
(requires Pillow). No service worker or offline picture cache is installed.
