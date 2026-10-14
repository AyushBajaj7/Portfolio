import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const coverage = [...Array.from({ length: 19 }, (_, index) => index * 16), 299];
const firstCoverage = [0, 299, 144, 64, 224];

// Zero-based frame indices. Widely separated poses arrive first when streamed.
export const BOOTSTRAP_INDICES = Object.freeze([
  ...firstCoverage,
  ...coverage.filter(index => !firstCoverage.includes(index)),
]);

export function encodeBootstrap(frames) {
  const indices = new Set();
  for (const { index, bytes } of frames) {
    if (!Number.isInteger(index) || index < 0 || index > 299 || indices.has(index)) {
      throw new Error(`Invalid or duplicate avatar frame index: ${index}`);
    }
    indices.add(index);
    if (!Buffer.isBuffer(bytes) || bytes.length < 12 || bytes.length > 0xffffffff ||
        bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP' ||
        bytes.readUInt32LE(4) + 8 !== bytes.length) {
      throw new Error(`Invalid WebP bytes for avatar frame ${index}`);
    }
  }
  if (frames.length !== coverage.length || coverage.some(index => !indices.has(index))) {
    throw new Error('Avatar bootstrap must contain every 16th frame and frame 299 exactly once');
  }

  const manifest = Buffer.from(JSON.stringify({
    frames: frames.map(({ index, bytes }) => ({ index, size: bytes.length })),
  }), 'utf8');
  const header = Buffer.alloc(8);
  header.write('AVB1', 0, 'ascii');
  header.writeUInt32LE(manifest.length, 4);
  return Buffer.concat([header, manifest, ...frames.map(({ bytes }) => bytes)]);
}

export async function buildAvatarBootstrap(sourceDir = join(root, 'public', 'frames-anchors')) {
  const frames = await Promise.all(BOOTSTRAP_INDICES.map(async index => ({
    index,
    bytes: await readFile(join(sourceDir, `male${String(index + 1).padStart(4, '0')}.webp`)),
  })));
  return encodeBootstrap(frames);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length > 3) throw new Error('Usage: node scripts/build-avatar-bootstrap.mjs [output-directory]');
  const outputDir = resolve(root, process.argv[2] ?? 'public');
  const bytes = await buildAvatarBootstrap();
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, 'avatar-bootstrap.bin'), bytes);
  console.log(`Built avatar bootstrap: ${BOOTSTRAP_INDICES.length} frames, ${bytes.length.toLocaleString('en-US')} bytes (${(bytes.length / 1024).toFixed(1)} KiB).`);
}
