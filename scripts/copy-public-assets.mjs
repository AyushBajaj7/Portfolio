import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const publicDir = join(root, 'public');
const distDir = join(root, 'dist');

await mkdir(distDir, { recursive: true });

const entries = await readdir(publicDir, { withFileTypes: true });

for (const entry of entries) {
  const from = join(publicDir, entry.name);
  const to = join(distDir, entry.name);

  await rm(to, { recursive: true, force: true });
  await cp(from, to, { recursive: entry.isDirectory() });
}

console.log(`Copied ${entries.length} public asset groups to dist.`);
