import sharp from 'sharp';
import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? process.cwd());
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

  const source = join(sourceDir, fileName);
  const metadata = await sharp(source).metadata();
  if (metadata.width !== 960 || metadata.height !== 540 || !metadata.hasAlpha) {
    throw new Error(`Expected a transparent 960x540 animation frame: ${fileName}`);
  }
  // Keep one consistent resolution and avoid another lossy WebP encoding.
  // Never recreate the old 480x270 thumbnails that soften every fourth frame.
  await copyFile(source, join(outputDir, fileName));
}

console.log(`Copied ${frameIndices.length} uniform 960x540 scroll-anchor frames.`);
