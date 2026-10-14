import assert from 'node:assert/strict';
import test from 'node:test';
import { AvatarFrameCache } from '../src/lib/avatarFrames.ts';
import { installAvatarNetwork } from './helpers/avatar-network.mjs';

const options = {
  baseUrl: '/Portfolio/', decodeWidth: 16, budgetBytes: 100_000,
  concurrency: 2, radius: 0, requestTimeoutMs: 100,
};

for (const phase of ['headers', 'body']) {
  test(`hosted ${phase} stall releases its slot and retries an unchanged target`, async () => {
    const network = installAvatarNetwork({
      latencyMs: 10, decodeMs: 1, assetBytes: () => 100,
      requestBehavior: ({ attempt }) => attempt === 1 ? { hang: phase } : {},
    });
    let paintsReady = 0;
    const cache = new AvatarFrameCache({ ...options, onReady: () => paintsReady++ });
    try {
      cache.request(120, 1, false, true);
      await network.advance(99);
      assert.equal(cache.stats.frames, 0);
      assert.equal(cache.stats.inFlight, 1);
      assert.equal(network.requests[0].bodyStarted, phase === 'body');
      await network.advance(2);
      assert.equal(network.requests[0].aborted, true, 'The deadline must cover both headers and body');
      assert.equal(cache.stats.inFlight, 0, 'Timed-out transport must release the loading slot');
      await network.advance(1200);
      assert.equal(cache.nearest(120)?.index, 120, 'Recovery must not require another scroll event');
      assert.equal(paintsReady, 1);
      assert.equal(network.metrics.requests, 2, 'Retry the failed pose once after its cooldown');
      assert.equal(network.metrics.openFetches, 0);
      assert.equal(network.metrics.maxConcurrentFetches, 1);
    } finally {
      cache.dispose();
      await network.advance(1000);
      assert.equal(network.metrics.liveDecodedBytes, 0);
      network.restore();
    }
  });
}

test('stalled old requests cannot permanently occupy every slot after a scroll jump', async () => {
  const network = installAvatarNetwork({
    latencyMs: 10, decodeMs: 1, assetBytes: () => 100,
    requestBehavior: ({ index }) => index < 2 ? { hang: 'headers' } : {},
  });
  const cache = new AvatarFrameCache({ ...options, radius: 1, onReady() {} });
  try {
    cache.request(0, 1);
    await network.advance(20);
    assert.deepEqual(network.requests.map(request => request.index), [0, 1]);
    cache.request(200, 1);
    assert.equal(network.metrics.abortedRequests, 0, 'Scrolling itself must not cancel useful transfers');
    await network.advance(130);
    assert.equal(network.metrics.abortedRequests, 2);
    assert.equal(cache.nearest(200, 0)?.index, 200, 'Latest pose must run as soon as stalled slots expire');
    assert.ok(network.metrics.maxConcurrentFetches <= options.concurrency);
    assert.ok(network.requests.slice(2).every(request => request.index >= 199), 'Obsolete neighbors must not be requeued');
  } finally {
    cache.dispose();
    await network.advance(1000);
    assert.equal(network.metrics.liveDecodedBytes, 0);
    network.restore();
  }
});

for (const status of [404, 503]) {
  test(`an anchor HTTP ${status} falls back to the matching lowres pose`, async () => {
    const network = installAvatarNetwork({
      latencyMs: 10, decodeMs: 1, assetBytes: () => 100,
      requestBehavior: ({ source }) => source === 'frames-anchors' ? { status } : {},
    });
    const cache = new AvatarFrameCache({ ...options, onReady() {} });
    try {
      cache.request(120, 1, true, true);
      await network.advance(50);
      assert.deepEqual(network.requests.map(request => [request.source, request.index]), [
        ['frames-anchors', 120], ['frames-lowres', 120],
      ]);
      assert.equal(cache.nearest(120)?.index, 120);
      assert.equal(cache.stats.frames, 1);
      assert.equal(cache.stats.compressedFrames, 1);
      assert.equal(network.metrics.abortedRequests, 0);
      await network.advance(1200);
      assert.equal(network.metrics.requests, 2, 'Successful fallback must not repeatedly retry the broken anchor');
    } finally {
      cache.dispose();
      await network.advance(1000);
      assert.equal(network.metrics.liveDecodedBytes, 0);
      network.restore();
    }
  });
}

test('hiding the page cancels a stalled request without delaying its visible retry', async () => {
  const network = installAvatarNetwork({
    latencyMs: 10, decodeMs: 1, assetBytes: () => 100,
    requestBehavior: ({ attempt }) => attempt === 1 ? { hang: 'body' } : {},
  });
  const cache = new AvatarFrameCache({ ...options, onReady() {} });
  try {
    cache.request(75, 1, false, true);
    await network.advance(50);
    cache.pause(true);
    await network.advance(1000);
    assert.equal(network.metrics.requests, 1);
    assert.equal(cache.stats.inFlight, 0);
    cache.pause(false);
    await network.advance(20);
    assert.equal(cache.nearest(75)?.index, 75, 'Visibility cancellation must not enter failure cooldown');
    await network.advance(1200);
    assert.equal(network.metrics.requests, 2, 'Old deadlines must not cancel the successful resumed request');
    assert.equal(network.metrics.abortedRequests, 1);
  } finally {
    cache.dispose();
    await network.advance(1000);
    assert.equal(network.metrics.liveDecodedBytes, 0);
    network.restore();
  }
});
