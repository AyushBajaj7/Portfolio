/** Run `node scripts/simulate-avatar-scroll.mjs [--module=absolute/path.ts] [--output=path.json]`. */
import { readdir, stat, mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { installAvatarNetwork, sweepAvatar } from '../tests/helpers/avatar-network.mjs';

const arg = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const modulePath = resolve(arg('module') ?? 'src/lib/avatarFrames.ts');
const sourceSha256 = createHash('sha256').update(await readFile(modulePath)).digest('hex');
const { AvatarFrameCache } = await import(pathToFileURL(modulePath).href);
const bytesByAsset = new Map();
for (const directory of ['frames', 'frames-lowres', 'frames-anchors']) {
  const folder = resolve('public', directory);
  const names = (await readdir(folder)).filter(name => /^male\d+\.webp$/.test(name));
  await Promise.all(names.map(async name => bytesByAsset.set(`${directory}/${name}`, (await stat(resolve(folder, name))).size)));
}
const results = [];
for (const profile of [
  { name: 'desktop', decodeWidth: 960, budgetBytes: 192 * 1024 * 1024, concurrency: 4, radius: 12, coverageStep: 4 },
  { name: 'mobile', decodeWidth: 640, budgetBytes: 64 * 1024 * 1024, concurrency: 3, radius: 8, coverageStep: 8 },
]) {
  const network = installAvatarNetwork({
    latencyMs: 120,
    transferBytesPerSecond: 1_000_000,
    decodeMs: 8,
    assetBytes: (directory, index) => {
      const key = `${directory}/male${String(index + 1).padStart(4, '0')}.webp`;
      if (!bytesByAsset.has(key)) throw new Error(`Missing real source asset ${key}`);
      return bytesByAsset.get(key);
    },
  });
  const cache = new AvatarFrameCache({
    baseUrl: '/Portfolio/', sourceDirectory: 'frames-lowres',
    decodeWidth: profile.decodeWidth, budgetBytes: profile.budgetBytes,
    concurrency: profile.concurrency, decodeConcurrency: 2, radius: profile.radius,
    coverageStep: profile.coverageStep,
    onReady: () => {},
  });
  try {
    cache.request(0, 1, false, true);
    await network.advance(250);
    const firstPaint = cache.nearest(0)?.index ?? -1;
    const startup = { ...network.metrics, firstPaint };
    const cold = await sweepAvatar({ cache, network, from: 0, to: 299, durationMs: 5000, painted: firstPaint });
    const coldNetwork = { ...network.metrics };
    await network.advance(30_000);
    const warmup = { ...network.metrics, cache: cache.stats };
    const warm = await sweepAvatar({ cache, network, from: 299, to: 0, durationMs: 5000, painted: cold.painted });
    const forward = await sweepAvatar({ cache, network, from: 0, to: 299, durationMs: 5000, painted: warm.painted });
    let painted = forward.painted;
    const reversals = [];
    for (const [from, to] of [[299, 100], [100, 220], [220, 20], [20, 280], [280, 150]]) {
      const leg = await sweepAvatar({ cache, network, from, to, durationMs: 500, painted });
      painted = leg.painted;
      reversals.push(leg.metrics);
    }
    const finalNetwork = { ...network.metrics };
    const finalCache = { ...cache.stats };
    cache.dispose();
    await network.advance(1000);
    results.push({
      profile: profile.name, cacheOptions: profile, startup,
      coldForward: cold.metrics, coldNetwork, afterWarmup: warmup,
      warmReverse: warm.metrics, warmForward: forward.metrics,
      rapidReversals: reversals, finalNetwork, finalCache,
      disposedLiveDecodedBytes: network.metrics.liveDecodedBytes,
    });
  } finally {
    cache.dispose();
    network.restore();
  }
}
const report = {
  model: 'Deterministic real-cache simulation; 120ms RTT per request, 1 MB/s per transfer, 8ms bitmap decode, 60Hz target samples. This is not a browser FPS or shared-link bandwidth benchmark.',
  source: modulePath,
  sourceSha256,
  results,
};
const json = JSON.stringify(report, null, 2);
if (arg('output')) {
  const output = resolve(arg('output'));
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${json}\n`);
}
console.log(json);
