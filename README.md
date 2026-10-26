# ExBeam Interactive Explorer

ExBeam is a Vite + React interactive exploration space. Its core is hands-on worlds and experiments, led by Universe Explorer, Wave Lab, and Micro Ecology. Every experience shares navigation, bookmarking, fullscreen controls, exploration prompts, and a persistent notebook.

## Product And Records

- The default route is the exploration catalog, with a live Three.js Solar System overview, searchable categories, and six curated starting points. The homepage shares the Sun, eight planets and eleven representative moons with the astronomy module; labels, Earth/Jupiter/Saturn focus, overview reset, zoom and pause work directly in the preview. A missing texture keeps the remaining scene usable. All 20 existing experiences remain reachable.
- The journal separates visits and foreground exploration time from actual discoveries. Opening a module never counts as completing it.
- Universe observations, correct scale answers, saved notes, and validated wave/ecology experiments produce typed evidence in the shared journal.
- Bookmarks, notebook drafts, journal entries, and sessions persist in `exbeam.explorer.v2`. Previous bookmarks and usage records migrate without removing the old keys.
- Settings exports a JSON backup of journal entries, notebook drafts, bookmarks, and visit history. Imports merge without replacing existing discoveries. Artwork PNGs, chess matches, experiment parameters, and Summer Garden have separate local storage and are not included in that journal backup. Exploration records are device-local, not cloud-synced. Summer Garden retains its separate family sync.
- Art Studio supports mouse, pen and touch input, undo/redo, PNG export, and automatic project recovery through IndexedDB. Chess saves PGN move history and clocks, cancels pending moves on exit, and supports keyboard board navigation.
- Browser back/forward and direct `?module=e1#explore` links enter the same experience. `#library` maps to the journal; `#growth` preserves access to the family workspace.

## Cover Artwork

All 20 experience covers use the ExBeam Specimen Series: a dark graphite setting, clear subject-specific 3D compositions, consistent lighting, and restrained category accents. Home and Saved share the same cover component; cards use a stable 16:9 frame on desktop and mobile, local WebP files, responsive image selection, lazy loading, and an accessible error state.

- Shipped artwork: `public/images/covers/`, with 960 x 540 and 480 x 270 variants for every module.
- Creative direction and the complete built-in image generation prompt set: `design/experience-covers-v1.json`. These are illustrative covers, not scientific photography or in-module evidence.
- Preserved full-size PNGs and the contact sheet: `output/imagegen/covers-v1/` (local source assets, ignored by Git).
- `scripts/build-experience-covers.mjs` regenerates the WebP variants and verifies dimensions and size limits. It requires the optional build-time `sharp` package to be available to Node; it is not part of the app's runtime or normal production build.

## Module Workspaces V2

The other 19 experiences now share the `ModuleWorkbench` design system: graphite surfaces, subject accents, labeled native inputs, icon tools, stable boards/canvases, and independently scrolling content without covering the status strip. The detailed module inventory, source/model limitations and release boundaries are in `design/modules-v2.md`.

- Board games use 26 original local piece designs in `public/images/pieces/`. Xiangqi includes legal-move validation, worker-based local opponents, ten training positions, piece explanations, replay and validated JSON/FEN/PGN workflows. International chess retains all promotion choices and PGN; Go enforces captures, suicide, ko and positional superko with Sabaki.
- Reading and practice modules have actual local exercises, answer feedback, bookmarks, due-date or wrong-answer review, and validated local recovery. Independent correct answers are distinguished from hints, reveals, visits and self-assessment.
- Wave and ecology experiments retain actual measured/modelled results in exports. Art supports layers and project/image files. Currency shows provider/reference dates and works with a last-known cache when offline.
- `npm run test:explorer` covers module logic, storage and export contracts. `npm run test:jiangnan` covers the campaign map, missions, checkpoints and parent/iframe protocol. The corresponding optional browser scripts exercise real controls and save screenshots under `output/playwright/`.
- These module saves are local, not newly cloud-synced. Local checks do not authorize a production deployment; identity/data policy, dependency security and affected-device performance remain release checks.

## Universe Explorer

The astronomy module connects four scale families through a spatial hierarchy, with 44 curated objects rather than four unrelated scenes. A continuous path runs from the observable universe through the cosmic web, Local Group, Milky Way, Solar System, Earth system, and Moon close-up.

- A shared 3D viewport supports object selection, orbiting, zoom, simulation pause, labels, and overview framing.
- Deliberate wheel, pinch, and zoom-button gestures enter the selected object's next space or return to its parent. Boundaries have a new-gesture guard; camera animation, rotation, and resize never trigger a level change. Labels and canvas share a gesture surface.
- Other branches include the Andromeda nucleus, M33/NGC 604, LMC/Tarantula, M51/NGC 5195, Virgo/M87/M87*, Proxima b, Sirius B, and representative moons of Mars and the giant planets. Unmodeled objects are not implied to be absent. The Local Group does not include M51 or the Virgo Cluster.
- Breadcrumbs, per-object URLs, browser back/forward, clipboard sharing, and saved spatial position make trips resumable. For example: `?module=e1&space=detail%3Amoon&object=moon#explore`.
- All 44 objects have object-specific science sections covering mechanisms, observational evidence, misconceptions, and open questions, plus 14 glossary entries, related-object links, and NASA/JPL or original-research sources. Distances, dates, temperatures, and model boundaries are explained rather than presented as exact universal constants.
- A 12-stop route connects Earth to the observable universe. Search works across all scales.
- Observation notes, completion, quiz results, and the spatial address persist on the current device. Existing solar exploration records migrate once, and old universe notes remain valid.
- Telescope images have source links and credits in `public/images/universe/CREDITS.md`. Planet textures remain bundled from Solar System Scope.
- Solar System planets, the Moon, and all four Galilean moons use Astronomy Engine ephemerides and a shared UTC clock, starting at the current date. Speed, pause and return-to-now controls share the same time across navigation. Other representative moons use inclined circular mean orbits with JPL periods and illustrative initial phases; Triton is retrograde. Axial orientation and planetary rotation use IAU elements. Distances and sizes are separately compressed, and moon sizes enlarged for visibility: this is not an equal-scale chart or live telescope view.
- Eleven representative moons remain visible alongside their parent planets in the solar map; selecting a moon opens its canonical planetary system. A camera-centered, non-astrometric star field remains visible at every zoom, Earth has a separate cloud layer and thin limb atmosphere, and Saturn's ring shares its axial orientation. Orbit traces follow the modeled paths rather than arbitrary flat circles.
- Eight moon maps and the Earth cloud layer are locally bundled, with upstream authors, reuse licenses and processing notes in `public/images/solar-system/SATELLITE-CREDITS.md`. These mosaics include low-resolution or filled regions, not complete measured topography. Titan shows haze, not a fabricated surface. Rebuild with `scripts/build-satellite-textures.mjs` and optional build-time `sharp`. Phobos, Deimos and the unknown surface of Proxima b remain labeled illustrations. Elliptical galaxies use a spheroidal stellar distribution rather than spiral arms. Close-up selection markers are hidden so a marker cannot be mistaken for a planetary ring.
- Desktop, tablet, and mobile layouts share the same object data. WebGL failure leaves the reading and observation tools available.
- Galaxies combine depth-aware star fields, emissive gas, and absorbing dust. Nebulae use volume ray marching with different cloud and supernova-remnant profiles. The black-hole model traces approximately bent rays through an animated accretion disk; it is an educational visualization, not a general-relativity solver or a reconstruction of Sagittarius A*.
- Deep-space close-ups isolate the selected object. Mobile sampling and adaptive canvas resolution limit GPU cost while keeping interface text sharp.

Visual references: [NASA black-hole anatomy](https://science.nasa.gov/universe/black-holes/anatomy/) and [NASA/ESA Orion Nebula fly-through](https://science.nasa.gov/asset/hubble/3d-fly-through-of-the-orion-nebula/). The rendered volumes are illustrative models rather than observed 3D reconstructions.

Run the catalog and storage regression checks with `npm run test:universe`.

`tests/universe/browser-smoke.mjs` is a Playwright CLI scenario for the solar map, all six planetary systems, real canvas-pixel checks, moon label clicks/taps, portrait framing, pause, playback speed and clock reset. With the development server on port 8888 and a Playwright CLI page open, run `playwright-cli run-code "$(cat tests/universe/browser-smoke.mjs)"`. Screenshots go to `output/playwright/`.

Run product, backup, migration, wave-physics, and ecology checks with `npm run test:explorer`. The Explorer GitHub workflow runs both suites, TypeScript checks, and the production build.

## Summer Garden

The optional family workspace remains available through Settings or `#growth`, with existing data preserved:

- Daily Chinese, math, English, and sports tasks
- Random quizzes with automatic scoring and rewards
- Daily mood check-ins, a focus timer, and a seven-day growth record
- A 9 x 5 garden, plant shop, sunlight wallet, and family rewards
- Parent-only task management protected by a numeric PIN
- Cross-device task, mood, focus, and reward sync through a Cloudflare Worker and D1, with atomic updates, retry receipts, salted parent PINs and attempt limits

## Local Development

**Prerequisites:** Node.js 22.18+ (Node.js 24 recommended)

1. Install dependencies:
   `npm install`
2. Build the frontend:
   `npm run build`
3. Initialize only the local database (never replace this with `--remote`):
   `npx wrangler d1 execute exbeam-production --local --file cloudflare/schema.sql`
4. Run the complete local Cloudflare stack:
   `npm run dev:cloudflare`

For UI-only work, the Vite server is enough:
   `npm run dev`

## Cloudflare Deployment

`wrangler.jsonc` defines the Worker, bundled static assets, same-origin APIs, production zone routes, preview custom domain and the `DB` D1 binding. Production never reads a PostgreSQL password from a browser-prefixed environment variable. Legacy client SQL/Supabase adapters fail explicitly rather than silently returning empty records.

- Build and deploy: `npm run deploy:cloudflare`
- Backend checks: `npm run test:cloudflare`
- Live release checks: `npm run verify:cloudflare -- https://exbeam.com`
- Connection and migration status: `/api/health` and `/api/data-status`; Settings displays the actual status.
- The six public `/api/library/*` collections are read-only, paginated and searched with bound parameters. Old user, favorites and vocabulary-progress tables are preserved privately, never exposed through the content API.
- Family state is stored in `summer_workspaces`; optimistic atomic updates and persistent action receipts prevent lost updates and duplicate rewards. Ordinary module notes, artwork and board games remain device-local.
- The 2026-10-26 migration uses a consistent, read-only Neon snapshot and preserves all nine original tables and 31,407 records. Arrays/JSON stay JSON text in SQLite and are decoded by the library API; timestamps and IDs are retained. Private source exports and full-content checksum reports stay under ignored `.migration.local/` with restricted permissions, outside the website assets.
- The old Netlify site, function and Neon database remain intact for rollback. The authenticated original Netlify Blobs UI showed no stores at inventory time; this is recorded separately from the nine-table Neon verification.
- The old Neon project's public connections are blocked because a historical credential remained exposed. Data is preserved; rotate that credential before restoring public access. Cloudflare production exclusively uses D1.

`netlify.toml` and `netlify/functions/` are retained as historical rollback sources, not the production backend. The temporary transfer Worker has a separate random secret and is removed after full-content verification; production has no import or arbitrary-SQL route. Do not commit private snapshots, credentials or `.wrangler/` state. See `design/cloudflare-migration.md` for release evidence and rollback boundaries.
