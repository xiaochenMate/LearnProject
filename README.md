# ExBeam Learning Workspace

ExBeam is a Vite + React personal learning workspace for classical Chinese reading, vocabulary practice, board games, science interactives, and practical tools. The product is designed around daily practice, curated learning paths, and honest local progress tracking.

The Solar System Explorer uses locally bundled educational textures from Solar System Scope so the 3D experience remains available without third-party runtime image requests.

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
