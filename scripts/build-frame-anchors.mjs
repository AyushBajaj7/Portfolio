import sharp from 'sharp';
import { mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const sourceDir = join(root, 'public', 'frames-lowres');
const outputDir = join(root, 'public', 'frames-anchors');
const frameIndices = [...Array.from({ length: 75 }, (_, index) => index * 4), 299];

await mkdir(outputDir, { recursive: true });
const sourceFiles = new Set(await readdir(sourceDir));

for (const frameIndex of frameIndices) {
  const fileName = `male${String(frameIndex + 1).padStart(4, '0')}.webp`;
  if (!sourceFiles.has(fileName)) {
    throw new Error(`Missing source frame: ${fileName}`);
  }

  await sharp(join(sourceDir, fileName))
    .resize({ width: 480, height: 270, fit: 'fill' })
    .webp({ quality: 78, effort: 4 })
    .toFile(join(outputDir, fileName));
}

console.log(`Built ${frameIndices.length} 480x270 scroll-anchor frames.`);
