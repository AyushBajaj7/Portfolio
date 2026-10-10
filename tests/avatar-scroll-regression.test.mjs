import assert from 'node:assert/strict';
import test from 'node:test';
import { AvatarFrameCache } from '../src/lib/avatarFrames.ts';
import { installAvatarNetwork, sweepAvatar } from './helpers/avatar-network.mjs';

for (const profile of [
  { name: 'desktop', decodeWidth: 960, budgetBytes: 192 * 1024 * 1024, concurrency: 4, decodeConcurrency: 2, radius: 12, coverageStep: 4 },
  { name: 'constrained', decodeWidth: 640, budgetBytes: 64 * 1024 * 1024, concurrency: 3, decodeConcurrency: 1, radius: 8, coverageStep: 8 },
]) {
  test(`${profile.name}: sustained delayed scrolling makes progress without cancellation starvation`, async () => {
    const network = installAvatarNetwork();
    const cache = new AvatarFrameCache({ ...profile, baseUrl: '/', onReady() {} });
    try {
      cache.request(0, 1, false, true);
      await network.advance(200);
      const cold = await sweepAvatar({ cache, network, from: 0, to: 299, durationMs: 3000, painted: 0 });
      assert.ok(cold.painted > 270, 'The playhead must keep advancing before scrolling stops');
      assert.ok(cold.metrics.longestMovingHoldMs < 600, 'No multi-second transport starvation');
      assert.equal(network.metrics.abortedRequests, 0);
      assert.equal(cold.metrics.presentationOvershoots, 0);
      assert.ok(network.metrics.maxConcurrentFetches <= profile.concurrency);
      assert.ok(network.metrics.maxConcurrentDecodes <= profile.decodeConcurrency);
      assert.ok(cold.metrics.peakCacheBytes <= profile.budgetBytes);
    } finally {
      cache.dispose();
      await network.advance(1000);
      assert.equal(network.metrics.liveDecodedBytes, 0);
      assert.ok(network.bitmaps.every(bitmap => bitmap.closeCount === 1));
      network.restore();
    }
  });

  test(`${profile.name}: warmed coverage handles jumps immediately and reverse scrolling needs no network`, async () => {
    const network = installAvatarNetwork();
    const cache = new AvatarFrameCache({ ...profile, baseUrl: '/', onReady() {} });
    try {
      cache.request(299, 1, true);
      await network.advance(30_000);
      assert.equal(cache.stats.anchorFrames, cache.stats.anchorTotal);
      assert.equal(cache.stats.compressedFrames, 300);
      assert.ok(cache.stats.compressedBytes <= 12 * 1024 * 1024);
      for (const target of [17, 281, 140, 80, 220]) {
        const fallback = cache.nearest(target, target < 150 ? 299 : 0);
        assert.ok(fallback, 'A distant jump must have a synchronous decoded fallback');
        assert.ok(Math.abs(fallback.index - target) < profile.coverageStep);
      }
      const count = network.metrics.requests;
      const reverse = await sweepAvatar({ cache, network, from: 299, to: 0, durationMs: 5000, painted: 299 });
      assert.ok(reverse.metrics.withinFourFramesPercent >= 95);
      assert.equal(reverse.metrics.presentationOvershoots, 0);
      assert.equal(network.metrics.requests, count, 'Decoded eviction must not cause network refetches');
      assert.equal(network.metrics.repeatedRequests, 0);
      assert.equal(cache.stats.anchorFrames, cache.stats.anchorTotal, 'Detail decoding must not evict the backbone');
      const decodes = network.metrics.openDecodes;
      await network.advance(5000);
      const settled = cache.stats.decodes;
      await network.advance(5000);
      assert.equal(cache.stats.decodes, settled, 'A settled cache must not continuously decode and evict');
      assert.ok(decodes <= profile.decodeConcurrency);
    } finally {
      cache.dispose();
      await network.advance(1000);
      assert.equal(network.metrics.liveDecodedBytes, 0);
      network.restore();
    }
  });
}

test('data-saving warmup loads only anchors and nearby detail, then becomes idle', async () => {
  const network = installAvatarNetwork();
  const cache = new AvatarFrameCache({ baseUrl: '/', decodeWidth: 640, budgetBytes: 64 * 1024 * 1024, concurrency: 3, radius: 8, coverageStep: 8, prefetchAll: false, onReady() {} });
  try {
    cache.request(68, 1, true);
    await network.advance(15_000);
    assert.equal(cache.stats.anchorFrames, cache.stats.anchorTotal);
    assert.ok(network.metrics.requests < 60);
    assert.equal(network.metrics.openFetches, 0);
    assert.equal(network.metrics.openDecodes, 0);
    const count = network.metrics.requests;
    await network.advance(5000);
    assert.equal(network.metrics.requests, count);
  } finally { cache.dispose(); await network.advance(1000); network.restore(); }
});

test('a compressed budget smaller than the sequence does not create an endless prefetch loop', async () => {
  const network = installAvatarNetwork();
  const cache = new AvatarFrameCache({ baseUrl: '/', decodeWidth: 16, budgetBytes: 100_000, compressedBudgetBytes: 500_000, concurrency: 4, radius: 3, onReady() {} });
  try {
    cache.request(100, 1, true);
    await network.advance(30_000);
    assert.ok(cache.stats.compressedBytes <= 500_000);
    const count = network.metrics.requests;
    await network.advance(30_000);
    assert.equal(network.metrics.requests, count);
    assert.equal(network.metrics.openFetches, 0);
  } finally { cache.dispose(); await network.advance(1000); network.restore(); }
});
