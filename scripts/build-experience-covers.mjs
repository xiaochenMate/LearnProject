import { createRequire } from "node:module";
import { readFile, mkdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Sharp is a build-time asset utility, not an application/runtime dependency.
const require = createRequire(import.meta.url);
const sharp = require("sharp");
const root = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(
  await readFile(resolve(root, "design/experience-covers-v1.json"), "utf8"),
);
const source = resolve(root, "output/imagegen/covers-v1");
const destination = resolve(root, "public/images/covers");
await mkdir(destination, { recursive: true });
const report = [];

for (const asset of manifest.assets) {
  const input = resolve(source, `${asset.id}.png`);
  const metadata = await sharp(input).metadata();
  if (metadata.width < 960 || metadata.height < 540)
    throw new Error(`Source too small: ${asset.id}`);
  const variants = [];
  for (const width of [480, 960]) {
    const file = `${asset.id}${width === 480 ? "-480" : ""}.webp`;
    const path = resolve(destination, file);
    await sharp(input)
      .rotate()
      .resize(width, (width * 9) / 16, { fit: "cover", position: "centre" })
      .webp({ quality: 82, effort: 6 })
      .toFile(path);
    const info = await sharp(path).metadata();
    const bytes = (await stat(path)).size;
    if (
      info.width !== width ||
      info.height !== (width * 9) / 16 ||
      bytes > 160_000
    )
      throw new Error(`Invalid cover variant: ${file}`);
    variants.push({ file, width, height: info.height, bytes });
  }
  report.push({ id: asset.id, title: asset.title, variants });
}

const thumbs = [];
for (let index = 0; index < report.length; index++) {
  thumbs.push({
    input: await sharp(resolve(destination, `${report[index].id}-480.webp`))
      .resize(320, 180)
      .png()
      .toBuffer(),
    left: (index % 4) * 320,
    top: Math.floor(index / 4) * 180,
  });
}
await sharp({
  create: {
    width: 1280,
    height: Math.ceil(report.length / 4) * 180,
    channels: 3,
    background: "#0b0d10",
  },
})
  .composite(thumbs)
  .png()
  .toFile(resolve(source, "collection-preview.png"));
await writeFile(
  resolve(source, "asset-report.json"),
  JSON.stringify(report, null, 2) + "\n",
);
const totalBytes = report.reduce(
  (sum, asset) =>
    sum + asset.variants.reduce((size, variant) => size + variant.bytes, 0),
  0,
);
console.log(
  JSON.stringify(
    {
      covers: report.length,
      variants: report.length * 2,
      totalBytes,
      maxBytes: Math.max(
        ...report.flatMap((asset) =>
          asset.variants.map((variant) => variant.bytes),
        ),
      ),
    },
    null,
    2,
  ),
);
