import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAvatarBootstrap } from '../scripts/build-avatar-bootstrap.mjs';
import { readAvatarBootstrap } from '../src/lib/avatarBootstrap.ts';
import { AvatarFrameCache } from '../src/lib/avatarFrames.ts';
import { avatarProfile } from '../src/lib/avatarProfile.ts';
import { installAvatarNetwork } from './helpers/avatar-network.mjs';

const bytes = await buildAvatarBootstrap();
const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

function packedNetwork({ status = 200, delay = 500 + bytes.length / 1000, networkOptions = {} } = {}) {
  const network = installAvatarNetwork({ latencyMs: 500, ...networkOptions });
  const originalFetch = globalThis.fetch;
  const packs = [];
  globalThis.fetch = (url, init) => {
    if (!String(url).endsWith('avatar-bootstrap.bin')) return originalFetch(url, init);
    packs.push({ url, started: network.now });
    return new Promise((resolve, reject) => {
      const abort = () => { clearTimeout(timer); reject(init.signal.reason); };
      const timer = setTimeout(() => {
        init.signal.removeEventListener('abort', abort);
        resolve({ ok: status === 200, status, arrayBuffer: async () => buffer });
      }, delay);
      init.signal.addEventListener('abort', abort, { once: true });
    });
  };
  return { network, packs };
}

const profile = avatarProfile({ width: 1440, coarsePointer: false });
const coverage = cache => Array.from({ length: 300 }, (_, index) => {
  const frame = cache.nearest(index, 0);
  return frame && index - frame.index <= 15;
}).every(Boolean);

test('bootstrap validates the shipped frame payload and rejects a truncated response', () => {
  const frames = readAvatarBootstrap(buffer);
  assert.equal(frames.length, 20);
  assert.ok(frames.every(frame => frame.blob.type === 'image/webp'));
  assert.throws(() => readAvatarBootstrap(buffer.slice(0, -1)));
});

test('one packed request prepares coarse whole-page coverage sooner than individual requests', async t => {
  const measured = {};
  for (const bootstrap of [false, true]) {
    const { network, packs } = packedNetwork();
    const cache = new AvatarFrameCache({ ...profile, baseUrl: '/', bootstrapUrl: bootstrap ? '/avatar-bootstrap.bin' : undefined, onReady() {} });
    try {
      cache.request(0, 1, true);
      let elapsed = 0;
      while (!coverage(cache) && elapsed < 20000) { await network.advance(50); elapsed += 50; }
      assert.ok(coverage(cache), 'Every scroll position must have an already decoded pose within 15 frames');
      measured[bootstrap ? 'packedMs' : 'individualMs'] = elapsed;
      if (bootstrap) {
        assert.equal(packs.length, 1);
        assert.equal(cache.stats.bootstrap, 'ready');
        assert.ok(cache.stats.decodedBytes <= profile.budgetBytes);
      }
    } finally { cache.dispose(); await network.advance(1000); network.restore(); }
  }
  assert.ok(measured.packedMs < measured.individualMs / 2, 'Bootstrap must remove the coarse-coverage request waterfall');
  t.diagnostic(JSON.stringify({ model: '500ms per-request latency, 1 MB/s per transfer, 8ms decode; not browser FPS', packBytes: bytes.length, ...measured }));
});

test('a missing bootstrap pack falls back to individual files instead of stopping playback', async () => {
  const { network } = packedNetwork({ status: 404, delay: 50 });
  const cache = new AvatarFrameCache({ ...profile, baseUrl: '/', bootstrapUrl: '/avatar-bootstrap.bin', onReady() {} });
  try {
    cache.request(144, 1, true);
    await network.advance(1200);
    assert.equal(cache.stats.bootstrap, 'fallback');
    assert.equal(cache.nearest(144, 0)?.index, 144);
  } finally { cache.dispose(); await network.advance(1000); network.restore(); }
});

test('reduced-motion still requests never download the pack', async () => {
  const { network, packs } = packedNetwork();
  const cache = new AvatarFrameCache({ ...profile, baseUrl: '/', bootstrapUrl: '/avatar-bootstrap.bin', onReady() {} });
  try {
    cache.request(68, 1, false, true);
    await network.advance(1000);
    assert.equal(packs.length, 0);
    assert.equal(cache.stats.frames, 1);
  } finally { cache.dispose(); await network.advance(1000); network.restore(); }
});

test('bootstrap waits for a free slot and resumes safely after visibility cancellation', async () => {
  const { network, packs } = packedNetwork();
  const cache = new AvatarFrameCache({ ...profile, baseUrl: '/', bootstrapUrl: '/avatar-bootstrap.bin', onReady() {} });
  try {
    cache.request(10, 1);
    assert.equal(cache.stats.inFlight, profile.concurrency);
    cache.request(100, 1, true);
    assert.equal(packs.length, 0, 'Warmup must not exceed the shared request limit');
    await network.advance(600);
    assert.equal(packs.length, 1);
    assert.ok(cache.stats.inFlight <= profile.concurrency);
    cache.pause(true);
    await network.advance(100);
    assert.equal(cache.stats.inFlight, 0);
    cache.pause(false);
    await network.advance(1600);
    assert.equal(packs.length, 2);
    assert.equal(cache.stats.bootstrap, 'ready');
    assert.ok(cache.stats.inFlight <= profile.concurrency);
  } finally { cache.dispose(); await network.advance(1000); network.restore(); }
});

test('valid packed frames recover even after individual requests exhaust retries', async () => {
  const { network } = packedNetwork({ delay: 3300, networkOptions: {
    latencyMs: 10, requestBehavior: ({ index }) => index === 144 ? { status: 503 } : {},
  } });
  const cache = new AvatarFrameCache({ ...profile, baseUrl: '/', bootstrapUrl: '/avatar-bootstrap.bin', onReady() {} });
  try {
    cache.request(144, 1, true);
    await network.advance(3200);
    assert.notEqual(cache.nearest(144)?.index, 144);
    await network.advance(300);
    assert.equal(cache.nearest(144)?.index, 144, 'A healthy packed pose must clear earlier individual failures');
  } finally { cache.dispose(); await network.advance(1000); network.restore(); }
});
