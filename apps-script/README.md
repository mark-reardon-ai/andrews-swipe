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

## Completion emails and test runs

In Project Settings > Script Properties, set:

- `NOTIFY_EMAIL`: the address that should receive completion emails. No address is stored in the code or public manifest.
- `ADMIN_KEY`: the same casual admin key as `public/rounds.json`, required for test reset requests.

After updating Code.gs, use Deploy > Manage deployments > Edit > **New version**, then deploy. Authorize the new **MailApp** email permission when Google prompts; you may need to run a function from the editor to grant the updated scopes. Consumer accounts typically have a quota of about **100 email recipients/day**. Check the account’s current Apps Script quotas if mail fails.

Finish a full run at `?who=mark`. Test answers go only to `answers_test` and `files_test`; GET with `test=1` reads `files_test`. `?test=1&who=jane` (also tom/both) rehearses another person. The email subject starts `[TEST]`. Real files use `answers` and `files` and have no test prefix. Emails include round, deck, answer counts, loved questions, notes, and a Sheet link.

The client reports completion and total cards; the script checks the answer count too. The `notified` tab records deck/person/test after a successful send, so later edits do not send another email. Missing `NOTIFY_EMAIL` skips sending without marking it notified. A failed send returns an error so the client can retry. Mail delivery and writing the notification row are separate Google operations; a service failure between them can cause a duplicate on retry.

`?reset=1&key=<admin_key>` clears test data on this phone and requests a Sheet reset. The server accepts `{action:"reset_test",key}` only when the key matches nonempty Script Property `ADMIN_KEY`. It clears test rows and only test notification records, allowing another test email. Real tabs and real notification records stay intact. This remains a casual family workflow, not secure authentication.
