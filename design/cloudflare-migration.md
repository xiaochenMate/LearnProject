# ExBeam Cloudflare Migration

## Delivery (2026-10-26, Asia/Shanghai)

- Production: https://exbeam.com, served by the `exbeam` Cloudflare Worker and its bundled static assets.
- `www.exbeam.com` redirects to the canonical origin with HTTP 308, retaining the path and query. Preview: https://preview.exbeam.com.
- Release marker: `2026-10-26-cloudflare-1`. Verified production Worker version: `2709f89f-467f-403e-98b7-8f4945e15c85`.
- Database: Cloudflare D1 `exbeam-production`, `ec260552-1076-401a-9b2f-cf67da6a4fc7`, created in APAC and observed serving from NRT.
- Production uses Cloudflare zone routes, not a Netlify proxy: the Worker serves its own `ASSETS` binding and D1. The original proxied DNS records are deliberately retained for rollback; no production request needs the old origin. Creating an apex Custom Domain conflicted with those records, so the site was switched through the supported zone-route mechanism without deleting DNS records.

## Database Diagnosis And Transfer

The original Neon database was reachable and intact. The old browser adapters depended on frontend environment variables and returned empty arrays when configuration was missing, while redesigned modules used local selections. There was no server-side API connecting the complete database to the new reading surfaces. A missing adapter connection was therefore indistinguishable from an empty collection.

The new site has server-side, paginated public-content APIs, explicit failures and a real connection indicator in Settings. The three cultural modules expose the full cloud collection without replacing local practice, offline selections or learning records. User tables are not public content endpoints.

| Source Table | Source Rows | D1 Rows | Full Content Check |
| --- | ---: | ---: | --- |
| brain_teasers | 58 | 58 | Match |
| idioms | 30,895 | 30,895 | Match |
| poems | 70 | 70 | Match |
| portal_favorites | 1 | 1 | Match |
| portal_users | 61 | 61 | Match |
| sanzijing_verses | 61 | 61 | Match |
| vocab_categories | 8 | 8 | Match |
| vocab_words | 225 | 225 | Match |
| vocab_progress | 28 | 28 | Match |
| **Total** | **31,407** | **31,407** | **9/9 Match** |

The source was exported in one read-only, repeatable-read transaction. The target was read back in full and compared using canonical SHA-256 checksums, not row counts alone. Source IDs, nulls, timestamps, JSON, arrays, unique constraints and foreign keys were retained. A second source snapshot immediately before cutover confirmed every source record was unchanged. D1 `quick_check` returned `ok`; `foreign_key_check` returned no violations.

Private source exports, schema, manifests, complete digests, verification records and original network settings are in ignored `.migration.local/`, outside the frontend build. The export directory uses mode 0700 and its records use mode 0600. They must not be committed or copied into `public/` or `dist/`.

## Family Data And Security

- The authenticated Netlify project Blobs inventory initially showed no stores or family records. This observation is separate from the nine-table Neon migration. A pre-cutover QA request later created one isolated test family on the preserved Netlify function; that record is explicitly not counted as D1 verification or real family data. It is retained on the old site rather than deleting source data.
- New family state is stored in D1. Production tests first verify the Worker release and real database health before writing a test family. Tests verified parent PINs, rejected child configuration changes, concurrent task completions, persistent state and duplicate-reward prevention. Only the newly created D1 QA families and their receipts were removed afterwards.
- Existing device-local tasks, artwork, chess games, notes and browser records are not automatically uploaded. Family sync retains the original protocol and polling behavior; ordinary module records remain local.
- The temporary, random-secret transfer Worker was removed after verification. Its secret file was discarded. Production has no arbitrary SQL or import route. The former transfer path now rejects POST requests through ordinary asset handling instead of reaching a database importer.
- A historical source password embedded in Git was confirmed still valid. After D1 cutover, the source project `calm-heart-97492012` was reversibly set to `block_public_connections: true`. A direct read with that credential was rejected as a blocked-network connection; the D1 health check remained successful. No source data or role was deleted. Rotate that historical password before ever reopening source public access; this release does not rewrite Git history.

## Acceptance

- Production live checks: **13/13 passed**, including six actual collections, search, pagination, native JSON arrays, private-table rejection, same-origin write protection, unknown-API JSON 404s, new entry bundles and real game assets. Responses no longer carry Netlify origin request headers.
- Production family checks: **6/6 passed** after checking the deployed Worker identity. Equivalent preview checks passed independently.
- Cloudflare unit/runtime suite: **59 passed, 0 failed, 1 optional mock-browser entry skipped**. The browser owner separately ran that mock-browser check successfully at 1280, 390 and 320px; it is not substituted for production data verification.
- Real Chrome preview acceptance displayed 30,895 idioms, searched an actual term and opened its explanation, example and classical source. TypeScript and the production build passed.
- One initial large-asset request timed out on the local direct network path. Rechecking through the machine's existing system proxy downloaded the actual tank model successfully; the final full live check passed. No device-wide proxy, TLS or protocol settings were changed.
- Existing module interaction tests were reused for unchanged chess/science/game flows. Real iOS hardware performance, long-duration usage, broader account synchronization and development-dependency advisories remain separate maintenance work, not claimed as completed by migration.

## Operate And Roll Back

- `npm run deploy:cloudflare` builds and deploys the Worker/assets to the configured routes. `npm run test:cloudflare` is part of the repository checks.
- `npm run verify:cloudflare -- https://exbeam.com` checks the live service. `/api/health` probes D1; `/api/data-status` recounts source tables against the verified manifest.
- No new GitHub deployment credential was created. The deployment command uses the operator's existing Wrangler login; GitHub pushes alone are not claimed to deploy Cloudflare automatically.
- The old Netlify site and immutable deploy `6adddac6f8c80a10be59b591` remain available. The original apex A record (`75.2.60.5`, proxied) and `www` CNAME (`learntoolsport.netlify.app`, proxied) are retained and recorded privately. The old site is a preserved rollback source, not a second writer for new D1 families.
- A pre-cutover rollback can remove only the two `exbeam` production zone routes while retaining the preview domain and all D1 data. Do not remove the `DB` database. Reopening Neon additionally requires credential rotation and deliberate restoration of the recorded network setting.
- After production receives real family writes, rolling back only frontend hosting would not transfer those writes to Netlify. Export and reconcile D1 family state before a backend rollback; never replace it with the old empty store.
