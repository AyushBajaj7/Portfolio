/** Read-only avatar asset inventory and expression contact sheet. */
import sharp from 'sharp';
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { join, resolve, extname } from 'node:path';

const root = resolve(process.argv[2] ?? process.cwd());
const output = join(root, 'artifacts', 'qa');
await mkdir(output, { recursive: true });
const summaries = [];
for (const folder of ['frames', 'frames-lowres', 'frames-anchors']) {
  const names = (await readdir(join(root, 'public', folder))).filter(name => /\.(png|webp)$/i.test(name)).sort();
  const groups = new Map();
  for (let start = 0; start < names.length; start += 8) {
    const records = await Promise.all(names.slice(start, start + 8).map(async name => {
      const file = join(root, 'public', folder, name);
      const [metadata, fileStat] = await Promise.all([sharp(file).metadata(), stat(file)]);
      return { name, bytes: fileStat.size, format: extname(name).slice(1), width: metadata.width, height: metadata.height, channels: metadata.channels, hasAlpha: metadata.hasAlpha, space: metadata.space, depth: metadata.depth };
    }));
    for (const record of records) {
      const key = `${record.format} ${record.width}x${record.height} alpha:${record.hasAlpha}`;
      const group = groups.get(key) ?? { ...record, name: undefined, bytes: 0, count: 0, minBytes: Infinity, maxBytes: 0 };
      group.count += 1;
      group.bytes += record.bytes;
      group.minBytes = Math.min(group.minBytes, record.bytes);
      group.maxBytes = Math.max(group.maxBytes, record.bytes);
      groups.set(key, group);
    }
  }
  summaries.push({ folder, count: names.length, groups: [...groups.values()] });
}

const sampleFrames = [0, 20, 35, 50, 68, 88, 100, 120, 150, 175, 195, 212, 224, 236, 254, 268, 280, 284, 299];
const samples = [];
const composites = [];
const tileWidth = 320;
const tileHeight = 300;
for (const [position, index] of sampleFrames.entries()) {
  const name = `male${String(index + 1).padStart(4, '0')}.webp`;
  const file = join(root, 'public', 'frames', name);
  const alpha = await sharp(file).extractChannel('alpha').stats();
  samples.push({ index, name, alpha: alpha.channels[0] });
  const face = await sharp(file).extract({ left: 340, top: 15, width: 600, height: 500 }).resize(tileWidth, 267).flatten({ background: '#111827' }).toBuffer();
  const label = Buffer.from(`<svg width="320" height="33"><rect width="320" height="33" fill="#111827"/><text x="12" y="23" font-family="sans-serif" font-size="18" fill="#f8fafc">Frame ${index} · ${name}</text></svg>`);
  const left = (position % 5) * tileWidth;
  const top = Math.floor(position / 5) * tileHeight;
  composites.push({ input: face, left, top }, { input: label, left, top: top + 267 });
}
const contactSheet = join(output, 'avatar-expression-contact-sheet.jpg');
await sharp({ create: { width: tileWidth * 5, height: tileHeight * 4, channels: 3, background: '#111827' } }).composite(composites).jpeg({ quality: 94 }).toFile(contactSheet);
const report = { generatedAt: new Date().toISOString(), summaries, samples, contactSheet };
await writeFile(join(output, 'avatar-assets-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ summaries, contactSheet }, null, 2));
