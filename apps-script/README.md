# Optional answer syncing for Mark

1. Create a Google Sheet in your account. Open Extensions > Apps Script.
2. Replace the starter code with Code.gs from this folder; save it.
3. Choose Deploy > New deployment > Web app.
4. Set Execute as: Me. Set Who has access: Anyone. Authorize the script when Google asks.
5. Click Deploy and copy the web app URL ending in `/exec` (not the editor or test URL).
6. Paste it into `public/rounds.json` as `answers_endpoint`. Build and publish the static site again.
7. Answer a sample card and check the `answers` and `files` tabs. Disconnect, answer another card, reconnect and confirm it arrives.
8. For script updates, use Deploy > Manage deployments > Edit > New version and deploy again to retain the URL.

No deployment has been performed by this project. Keep the Google Sheet private. Anyone with the endpoint URL can read/write answer files; this simple family workflow has no authentication. Use it only for renovation preferences, not sensitive information. The POST uses text/plain to avoid a CORS preflight. Test the deployed endpoint from the real hosting origin (Google redirects responses). Empty endpoint leaves the app local only.

Rows are upserted by deck_id + app person + card_id; joint rows have person `both` and joint true. Latest raw merged JSON is kept per deck/person in `files`; GET takes deck_id and person (tom/jane/both). Newest answer timestamp wins. IDs must remain unique across rounds for remote storage. Clearing browser progress does not delete remote data. Undo sends timestamped x_removed tombstones so removed answers do not reappear on restore. A later replacement answer with a newer timestamp supersedes the tombstone.
