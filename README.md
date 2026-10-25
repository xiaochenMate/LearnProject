# ExBeam Learning Workspace

ExBeam is a Vite + React personal learning workspace for classical Chinese reading, vocabulary practice, board games, science interactives, and practical tools. The product is designed around daily practice, curated learning paths, and honest local progress tracking.

## Universe Explorer

The astronomy module spans four selectable scales: the solar system, the Milky Way, nearby galaxies, and large-scale cosmic structures. Its 26 curated objects include planets, stars, nebulae, a black hole, galaxies, clusters, and the observable universe.

- A shared 3D viewport supports object selection, orbiting, zoom, simulation pause, labels, and overview framing.
- A 12-stop route connects Earth to the observable universe. Search works across all scales.
- Observation notes, completion, quiz results, and the last object persist on the current device. Existing solar exploration records migrate once.
- Telescope images have source links and credits in `public/images/universe/CREDITS.md`. Planet textures remain bundled from Solar System Scope.
- All positions and relative sizes are educational schematics, not a real-time sky chart. The observable universe is not the entire universe or a physical boundary.
- Desktop, tablet, and mobile layouts share the same object data. WebGL failure leaves the reading and observation tools available.
- Galaxies combine depth-aware star fields, emissive gas, and absorbing dust. Nebulae use volume ray marching with different cloud and supernova-remnant profiles. The black-hole model traces approximately bent rays through an animated accretion disk; it is an educational visualization, not a general-relativity solver or a reconstruction of Sagittarius A*.
- Deep-space close-ups isolate the selected object. Mobile sampling and adaptive canvas resolution limit GPU cost while keeping interface text sharp.

Visual references: [NASA black-hole anatomy](https://science.nasa.gov/universe/black-holes/anatomy/) and [NASA/ESA Orion Nebula fly-through](https://science.nasa.gov/asset/hubble/3d-fly-through-of-the-orion-nebula/). The rendered volumes are illustrative models rather than observed 3D reconstructions.

Run the catalog and storage regression checks with `npm run test:universe`.

## Summer Garden

The home view is a child-friendly summer homework workspace with:

- Daily Chinese, math, English, and sports tasks
- Random quizzes with automatic scoring and rewards
- Daily mood check-ins, a focus timer, and a seven-day growth record
- A 9 x 5 garden, plant shop, sunlight wallet, and family rewards
- Parent-only task management protected by a numeric PIN
- Cross-device task, mood, focus, and reward sync through a Netlify Function and strongly consistent Netlify Blobs

## Local Development

**Prerequisites:** Node.js 20+

1. Install dependencies:
   `npm install`
2. Link the existing Netlify project when testing family sync:
   `netlify link`
3. Run the complete local stack:
   `netlify dev`

For UI-only work, the Vite server is enough:
   `npm run dev`

## Netlify Deployment

Build settings are defined in `netlify.toml`:

- Build command: `npm run build`
- Publish directory: `dist`

Family workspace data is stored in a site-scoped Blobs store named `exbeam-summer-workspaces`. Database credentials should stay server-side. Use `VITE_NEON_DATABASE_URL` only for a deliberately read-only client connection.
