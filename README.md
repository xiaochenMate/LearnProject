<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ExBeam Learning Workspace

ExBeam is a Vite + React personal learning workspace for classical Chinese reading, vocabulary practice, board games, science interactives, and practical tools. The product is designed around daily practice, curated learning paths, and honest local progress tracking.

## Local Development

**Prerequisites:** Node.js 20+

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and fill only the values you need.
3. Run the app:
   `npm run dev`

## Netlify Deployment

Build settings are defined in `netlify.toml`:

- Build command: `npm run build`
- Publish directory: `dist`

Database credentials should stay server-side. Use `VITE_NEON_DATABASE_URL` only for a deliberately read-only client connection.
