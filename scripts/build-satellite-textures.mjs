import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const root = fileURLToPath(new URL('..', import.meta.url));
const destination = resolve(root, 'public/images/solar-system');
const api = 'https://api.github.com/repos/CelestiaProject/CelestiaContent';
async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return response.json();
}
const tree = await get(`${api}/git/trees/master?recursive=1`);
const assets = {
  io: 'legacy/io.jpg', europa: 'hires/europa.jpg',
  ganymede: 'hires/ganymede.jpg', callisto: 'hires/callisto.jpg',
  enceladus: 'hires/enceladus.jpg', titan: 'hires/titan-clouds.jpg',
  titania: 'medres/titania.jpg', triton: 'hires/triton.jpg',
  'earth-clouds': 'hires/earth-clouds.png',
};
await mkdir(destination, { recursive: true });
const credits = ['# Satellite and Cloud Texture Credits', '',
  'Derived from CelestiaContent: https://github.com/CelestiaProject/CelestiaContent',
  'These are image mosaics / processed maps, not complete measured topography.',
  'Titan shows visible-light haze, not a fabricated surface. Unobserved regions in some maps are filled or low resolution.',
  'Changes: resized to at most 2048 px wide and encoded as WebP. Surface-map alpha (specular masks) is removed; cloud opacity is preserved. No generated geological features added.', '',
  'Ephemerides: Astronomy Engine (MIT), https://github.com/cosinekitty/astronomy',
  'Mean satellite elements: https://ssd.jpl.nasa.gov/sats/elem/ and https://ssd.jpl.nasa.gov/sats/phys_par/', '',
  'Unchanged upstream author and licensing notices: UPSTREAM-README.txt and LICENSES/.',
  'CC-BY-SA texture derivatives retain CC-BY-SA-4.0; this applies to the texture, not unrelated application code.', '',
];
const licenseDirectory = resolve(destination, 'LICENSES');
await mkdir(licenseDirectory, { recursive: true });
for (const path of ['README', 'LICENSES/CC-BY-3.0.txt', 'LICENSES/CC-BY-4.0.txt', 'LICENSES/CC-BY-SA-4.0.txt', 'LICENSES/JPL-image.txt']) {
  const entry = tree.tree.find((item) => item.path === path);
  const blob = await get(entry.url);
  await writeFile(path === 'README' ? resolve(destination, 'UPSTREAM-README.txt') : resolve(destination, path), Buffer.from(blob.content, 'base64'));
}
for (const [id, path] of Object.entries(assets)) {
  const entry = id === 'io' ? { url: 'https://api.github.com/repos/CelestiaProject/Celestia/git/blobs/7baa5ddabb65397d7b45964d100399567e433a83' } : tree.tree.find((entry) => entry.path === `textures/${path}`);
  if (!entry) throw new Error(`Missing source ${path}`);
  const blob = await get(entry.url);
  const image = Buffer.from(blob.content, 'base64');
  const metadata = await sharp(image).metadata();
  if (!metadata.width || !metadata.height) throw new Error(`Invalid image: ${id}`);
  const stats = await sharp(image).removeAlpha().stats();
  if (id !== 'earth-clouds' && stats.channels.slice(0, 3).every((channel) => channel.mean < 10))
    throw new Error(`Unexpected dark surface map: ${id}; check for an emission-only map`);
  const pipeline = sharp(image).resize({ width: 2048, withoutEnlargement: true });
  if (id !== 'earth-clouds') pipeline.removeAlpha();
  const buffer = await pipeline.webp({ quality: 88 }).toBuffer();
  await writeFile(resolve(destination, `${id}.webp`), buffer);
  const license = tree.tree.find((item) => item.path === `textures/${path}.license`);
  const text = id === 'io' ? 'Courtesy NASA/JPL-Caltech/USGS. Voyager surface mosaic distributed with Celestia 1.6.4. JPL Image Use Policy applies; see LICENSES/JPL-image.txt.' : license ? Buffer.from((await get(license.url)).content, 'base64').toString('utf8') : 'NASA/JPL/USGS source map distributed with CelestiaContent; see upstream license and authors.';
  const source = id === 'io' ? 'https://github.com/CelestiaProject/Celestia/blob/1.6.4/textures/medres/io.jpg' : `https://github.com/CelestiaProject/CelestiaContent/blob/${tree.sha}/textures/${path}`;
  credits.push(`## ${id}.webp`, '', `Source: ${source}`, '', text.trim(), '');
  console.log(`${id}: ${metadata.width}x${metadata.height} -> ${buffer.length} bytes`);
}
await writeFile(resolve(destination, 'SATELLITE-CREDITS.md'), `${credits.join('\n')}\n`);
