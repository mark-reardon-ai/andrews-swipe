# Publishing a kitchen round

1. Prepare a deck JSON using `schema/swipe_card.schema.json`. Give it a new `deck_id` for a new round. Keep image paths relative, such as `img/kitchen.jpg`. Put the pictures beside the deck in its `img` folder.
2. From the app folder, run:

   ```sh
   npm run publish-round -- --round R02 --deck path/to/deck.json --img path/to/img --session-size 20 --title "Round 2: Our favorites" --make-current
   ```

   `--img` is optional if the deck's relative image paths already work. The script validates the deck, copies it and its pictures into `public/decks/R02/`, and adds or updates `public/rounds.json`. It creates 720 and 1280 pixel WebP pictures when `cwebp` or Python Pillow supports conversion; otherwise it warns and keeps original pictures. Existing available variants are copied too. `--make-current` tells the app to open this round. Leave it off to prepare a round without switching everyone yet.
3. Run `npm run build` and `npm test`. Deploy the contents of `dist/` to your static hosting service. The publishing command prepares local files; it does not upload them. Build after publishing so the new files go into `dist/`.
4. Tom and Jane keep their same links, ending in `?who=tom` and `?who=jane` (or `?who=both`). Each visit reads `rounds.json` without cache and follows its `current` round. An open completion screen checks every minute and when it regains focus, and offers the new round. Old answers remain on the device.

## Where answers go

Answers save in browser localStorage for each round, deck, and person. With an empty `answers_endpoint` in `public/rounds.json`, they stay on that device until someone taps **Send my answers to Mark** and shares or downloads the JSON file. Favorites are in that file too.

With a deployed Apps Script URL in `answers_endpoint`, answers also queue locally and send to the Sheet when connected. The completion screen shows whether that file is still queued. See [Apps Script setup](../apps-script/README.md) for deployment. Do not place private credentials in this public manifest.

Mark opens `#/admin`, loads device answers, imports exported files, or taps **Fetch from Sheet**. Exports include individual answer files, a bundle with conflicts, and CSV rows. Joint files use `person: "other"`, `x_joint: true`; the CSV has a `joint` column. Imports and Sheet fetches merge into the workshop view; they do not overwrite this device's participant answers.

An optional `admin_key` in the manifest adds a casual lock; use `?key=your-key#/admin` or type the key once. This is not security: static files, the key, and device data remain browser accessible. The app includes noindex and robots exclusions to discourage search indexing.
