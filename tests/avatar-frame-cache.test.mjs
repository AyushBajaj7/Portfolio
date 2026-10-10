import assert from 'node:assert/strict';
import test from 'node:test';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { AvatarFrameCache } from '../src/lib/avatarFrames.ts';

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((accept, fail) => { resolve = accept; reject = fail; });
  return { promise, resolve, reject };
};

function browserMocks(t, { manualDecode = false } = {}) {
  const originals = new Map(['fetch', 'createImageBitmap'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const requests = [];
  const decodes = [];
  const bitmaps = [];
  let openRequests = 0;
  let maxOpenRequests = 0;

  globalThis.fetch = (url, { signal, priority }) => {
    const response = deferred();
    const index = Number(/male(\d+)\.webp$/.exec(url)[1]) - 1;
    const request = { index, url, signal, priority, response, settled: false };
    requests.push(request);
    openRequests++;
    maxOpenRequests = Math.max(maxOpenRequests, openRequests);
    const finish = () => {
      if (request.settled) return false;
      request.settled = true;
      openRequests--;
      signal.removeEventListener('abort', abort);
      return true;
    };
    const abort = () => {
      if (finish()) response.reject(new DOMException('Request aborted', 'AbortError'));
    };
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    request.respond = ({ ok = true, status = 200 } = {}) => {
      assert.ok(finish(), `Frame ${index} transport can resolve only once`);
      response.resolve({ ok, status, blob: async () => ({ index, size: 100 }) });
    };
    return response.promise;
  };

  globalThis.createImageBitmap = (blob, options) => {
    const bitmap = {
      index: blob.index, width: options.resizeWidth, height: options.resizeHeight,
      closeCount: 0, close() { this.closeCount++; },
    };
    bitmaps.push(bitmap);
    const pending = deferred();
    const decode = { index: blob.index, options, bitmap, resolve: () => pending.resolve(bitmap) };
    decodes.push(decode);
    return manualDecode ? pending.promise : Promise.resolve(bitmap);
  };

  t.after(() => {
    for (const [key, original] of originals) {
      if (original) Object.defineProperty(globalThis, key, original);
      else delete globalThis[key];
    }
  });

  return {
    requests, decodes, bitmaps,
    get maxOpenRequests() { return maxOpenRequests; },
    async respond(index) {
      const request = requests.findLast(item => item.index === index && !item.settled);
      assert.ok(request, `Frame ${index} must have an outstanding transport`);
      request.respond();
      await nextTurn();
    },
    async decode(index) {
      const decode = decodes.findLast(item => item.index === index);
      assert.ok(decode, `Frame ${index} must have reached decoding`);
      decode.resolve();
      await nextTurn();
    },
    async fail(index) {
      const request = requests.findLast(item => item.index === index && !item.settled);
      assert.ok(request, `Frame ${index} must have an outstanding transport`);
      request.respond({ ok: false, status: 503 });
      await nextTurn();
    },
  };
}

function makeCache(t, overrides = {}) {
  let readyCount = 0;
  const cache = new AvatarFrameCache({
    baseUrl: '/Portfolio/', decodeWidth: 16, budgetBytes: 100_000,
    concurrency: 2, radius: 3, onReady: () => readyCount++, ...overrides,
  });
  t.after(() => cache.dispose());
  return { cache, get readyCount() { return readyCount; } };
}

test('prefetch remains bounded while completing a neighborhood of frame requests', async t => {
  const browser = browserMocks(t);
  const { cache } = makeCache(t, { radius: 5 });
  cache.request(100, 1);
  assert.deepEqual(browser.requests.map(request => request.index), [100, 101]);
  assert.equal(browser.requests[0].priority, 'high');
  assert.equal(browser.requests[1].priority, 'low');
  for (let count = 0; count < 11; count++) {
    const outstanding = browser.requests.find(request => !request.settled);
    assert.ok(outstanding, 'Prefetch should continue as each slot becomes available');
    await browser.respond(outstanding.index);
    assert.ok(cache.stats.inFlight <= 2);
  }
  assert.equal(browser.maxOpenRequests, 2);
  assert.equal(cache.stats.frames, 11);
  assert.equal(cache.stats.inFlight, 0);
  assert.equal(browser.requests.length, 11);
  assert.ok(browser.requests.every(request => request.url.startsWith('/Portfolio/frames-lowres/')));
});

test('a rapid direction change keeps useful transfers and reprioritizes queued work', async t => {
  const browser = browserMocks(t);
  const { cache } = makeCache(t);
  cache.request(20, 1);
  const obsolete = [...browser.requests];
  cache.request(250, -1);
  await nextTurn();
  assert.ok(obsolete.every(request => !request.signal.aborted));
  await browser.respond(20);
  await browser.respond(21);
  assert.deepEqual(browser.requests.slice(2, 4).map(request => request.index), [250, 249]);
  assert.equal(browser.requests[2].priority, 'high');
  assert.ok(!browser.requests.some(request => request.index === 19), 'Old queued work must never start');
  await browser.respond(250);
  assert.equal(cache.nearest(250)?.index, 250);
});

test('a late decode remains reusable without replacing the newer displayed target', async t => {
  const browser = browserMocks(t, { manualDecode: true });
  const result = makeCache(t, { radius: 0 });
  result.cache.request(10, 1);
  await browser.respond(10);
  result.cache.request(200, 1);
  await browser.respond(200);
  await browser.decode(200);
  assert.equal(result.cache.nearest(200)?.index, 200);
  await browser.decode(10);
  assert.equal(browser.bitmaps.find(bitmap => bitmap.index === 10).closeCount, 0);
  assert.equal(result.cache.stats.frames, 2);
  assert.equal(result.cache.nearest(200, 200)?.index, 200, 'Completion never moves a settled playhead');
  assert.equal(result.cache.nearest(10, 200)?.index, 10, 'Reverse scrolling can immediately reuse it');
});

test('the byte budget releases distant bitmaps and retains the current frame', async t => {
  const browser = browserMocks(t);
  const bytesPerFrame = 16 * 9 * 4;
  const { cache } = makeCache(t, { radius: 0, budgetBytes: bytesPerFrame * 2 });
  for (const target of [10, 11, 12]) {
    cache.request(target, 1);
    await browser.respond(target);
  }
  assert.equal(cache.stats.frames, 2);
  assert.equal(cache.stats.decodedBytes, bytesPerFrame * 2);
  assert.equal(cache.nearest(12)?.index, 12);
  assert.equal(cache.nearest(10, 12)?.index, 11);
  assert.equal(browser.bitmaps.find(bitmap => bitmap.index === 10).closeCount, 1);
  cache.dispose();
  assert.equal(cache.stats.decodedBytes, 0);
  assert.ok(browser.bitmaps.every(bitmap => bitmap.closeCount === 1));
});

test('reduced-motion still requests load only the selected pose, even after warmup', async t => {
  const browser = browserMocks(t);
  const { cache } = makeCache(t, { radius: 5 });
  cache.request(284, 1, true, true);
  assert.deepEqual(browser.requests.map(request => request.index), [284]);
  await browser.respond(284);
  cache.request(68, -1, true, true);
  await browser.respond(68);
  assert.deepEqual(browser.requests.map(request => request.index), [284, 68]);
  assert.equal(cache.stats.inFlight, 0);
  assert.equal(cache.stats.queued, 0);
});

test('pause prevents work and resume retries the target interrupted by hiding the page', async t => {
  const browser = browserMocks(t);
  const { cache } = makeCache(t, { radius: 0 });
  cache.request(120, 1, false, true);
  cache.pause(true);
  await nextTurn();
  assert.equal(browser.requests[0].signal.aborted, true);
  assert.equal(cache.stats.inFlight, 0);
  cache.pause(false);
  await nextTurn();
  assert.deepEqual(browser.requests.map(request => request.index), [120, 120],
    'Resuming the unchanged pose must retry its aborted transport');
  await browser.respond(120);
  assert.equal(cache.nearest(120)?.index, 120);

  cache.pause(true);
  cache.request(130, 1, false, true);
  await nextTurn();
  assert.equal(browser.requests.length, 2, 'New work must stay queued while paused');
  cache.pause(false);
  assert.equal(browser.requests.at(-1).index, 130);
});

test('dispose aborts transport, closes late decodes, and prevents subsequent loading', async t => {
  const browser = browserMocks(t, { manualDecode: true });
  const result = makeCache(t, { radius: 1 });
  result.cache.request(40, 1);
  await browser.respond(40);
  const pendingTransport = browser.requests.find(request => request.index === 41);
  result.cache.dispose();
  assert.equal(pendingTransport.signal.aborted, true);
  assert.equal(result.cache.stats.frames, 0);
  assert.equal(result.cache.stats.queued, 0);
  await browser.decode(40);
  assert.equal(browser.bitmaps[0].closeCount, 1);
  assert.equal(result.readyCount, 0);
  assert.equal(result.cache.stats.inFlight, 0);
  assert.equal(result.cache.nearest(40), undefined);
  const requestsBefore = browser.requests.length;
  result.cache.request(150, 1);
  await nextTurn();
  assert.equal(browser.requests.length, requestsBefore);
});

test('a temporary network failure remains retryable after pausing during its cooldown', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10_000 });
  const browser = browserMocks(t);
  const { cache } = makeCache(t, { radius: 0 });
  cache.request(75, 1, false, true);
  await browser.fail(75);
  assert.equal(cache.stats.frames, 0);
  t.mock.timers.tick(100);
  cache.pause(true);
  t.mock.timers.tick(100);
  cache.pause(false);
  t.mock.timers.tick(1051);
  await nextTurn();
  assert.deepEqual(browser.requests.map(request => request.index), [75, 75],
    'Resuming must rearm retries that were canceled while hidden');
  await browser.respond(75);
  assert.equal(cache.nearest(75)?.index, 75);
});


test('presentation never overshoots the playhead or replays a decoded expression', async t => {
  const browser = browserMocks(t);
  const { cache } = makeCache(t, { radius: 0 });
  for (const target of [268, 284, 299]) {
    cache.request(target, 1);
    await browser.respond(target);
  }
  assert.equal(cache.nearest(280, 268)?.index, 268, 'Future wink anchor must not play early');
  assert.equal(cache.nearest(280)?.index, 268, 'Initial or resized canvas can use an earlier fallback');
  cache.request(280, 1);
  await browser.respond(280);
  assert.equal(cache.nearest(280, 268)?.index, 280);
  assert.equal(cache.nearest(282, 280)?.index, 280, 'Hold instead of jumping ahead to 284');
  assert.equal(cache.nearest(281, 299)?.index, 284, 'Reverse scrolling approaches from above');
  assert.equal(cache.nearest(285, 284)?.index, 284, 'Rapid reversal must not overshoot to 299');
});


test('cold start loads one pose and a constrained session stays on its chosen source', async t => {
  const browser = browserMocks(t);
  const { cache } = makeCache(t, { sourceDirectory: 'frames-lowres', decodeWidth: 960, budgetBytes: 24 * 1024 * 1024 });
  cache.request(0, 1, false, true);
  await browser.respond(0);
  assert.equal(browser.requests.length, 1);
  assert.equal(cache.stats.decodedBytes, 960 * 540 * 4);
  assert.equal(cache.stats.inFlight, 0);
  cache.request(20, 1);
  await browser.respond(20);
  assert.ok(browser.requests.every(request => request.url.startsWith('/Portfolio/frames-lowres/')));
  assert.ok(browser.decodes.every(decode => decode.options.resizeWidth === 960));
});
