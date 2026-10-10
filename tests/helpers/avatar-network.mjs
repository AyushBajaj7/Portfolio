import { setImmediate as nextTurn } from 'node:timers/promises';

/**
 * Deterministic transport/decode simulator. It runs the real cache implementation,
 * but does not measure browser paint time, device FPS, or a shared network link.
 * Each request has the configured RTT plus its payload/transfer rate, and each
 * bitmap has an independently controlled decode delay. No external requests run.
 */
export function installAvatarNetwork({
  latencyMs = 120,
  transferBytesPerSecond = 1_000_000,
  decodeMs = 8,
  assetBytes = () => 30_000,
  assetWidth = source => source === 'frames' ? 1280 : 960,
} = {}) {
  const keys = ['fetch', 'createImageBitmap', 'setTimeout', 'clearTimeout'];
  const originals = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const originalNow = Date.now;
  const timers = new Map();
  const requests = [];
  const bitmaps = [];
  const decodes = [];
  let now = 10_000;
  let nextTimer = 1;
  let openFetches = 0;
  let openDecodes = 0;
  let maxFetches = 0;
  let maxDecodes = 0;
  let liveDecodedBytes = 0;
  let peakDecodedBytes = 0;
  let restored = false;

  Date.now = () => now;
  globalThis.setTimeout = (callback, delay = 0, ...args) => {
    const id = nextTimer++;
    timers.set(id, { at: now + Math.max(0, Number(delay) || 0), callback: () => callback(...args) });
    return id;
  };
  globalThis.clearTimeout = id => timers.delete(id);

  globalThis.fetch = (url, { signal, priority } = {}) => {
    const match = /\/(frames[^/]*)\/male(\d+)\.webp(?:\?.*)?$/.exec(String(url));
    if (!match) throw new Error(`Unexpected test transport URL: ${url}`);
    const source = match[1];
    const index = Number(match[2]) - 1;
    const bytes = assetBytes(source, index);
    const request = { url: String(url), source, index, bytes, priority, started: now, ended: null, aborted: false };
    requests.push(request);
    openFetches++;
    maxFetches = Math.max(maxFetches, openFetches);
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = () => {
        if (settled) return false;
        settled = true;
        request.ended = now;
        openFetches--;
        signal?.removeEventListener('abort', abort);
        return true;
      };
      const timer = setTimeout(() => {
        if (!finish()) return;
        const blob = { index, source, size: bytes, width: assetWidth(source), height: assetWidth(source) * 9 / 16 };
        resolve({ ok: true, status: 200, blob: async () => blob });
      }, latencyMs + bytes / transferBytesPerSecond * 1000);
      const abort = () => {
        if (!finish()) return;
        clearTimeout(timer);
        request.aborted = true;
        reject(new DOMException('Synthetic request aborted', 'AbortError'));
      };
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort();
    });
  };

  globalThis.createImageBitmap = (blob, options = {}) => {
    openDecodes++;
    maxDecodes = Math.max(maxDecodes, openDecodes);
    const width = options.resizeWidth ?? blob.width;
    const height = options.resizeHeight ?? blob.height;
    const bytes = width * height * 4;
    const decode = { index: blob.index, source: blob.source, started: now, ended: null };
    decodes.push(decode);
    return new Promise(resolve => {
      setTimeout(() => {
        openDecodes--;
        decode.ended = now;
        liveDecodedBytes += bytes;
        peakDecodedBytes = Math.max(peakDecodedBytes, liveDecodedBytes);
        const bitmap = {
          index: blob.index, source: blob.source, width, height, closeCount: 0,
          close() {
            this.closeCount++;
            if (this.closeCount === 1) liveDecodedBytes -= bytes;
          },
        };
        bitmaps.push(bitmap);
        resolve(bitmap);
      }, decodeMs);
    });
  };

  return {
    requests, bitmaps, decodes,
    get now() { return now; },
    get metrics() {
      const completed = requests.filter(request => request.ended !== null && !request.aborted);
      return {
        requests: requests.length,
        completedRequests: completed.length,
        abortedRequests: requests.filter(request => request.aborted).length,
        repeatedRequests: requests.length - new Set(requests.map(request => request.url)).size,
        transferredBytes: completed.reduce((sum, request) => sum + request.bytes, 0),
        maxConcurrentFetches: maxFetches,
        maxConcurrentDecodes: maxDecodes,
        liveDecodedBytes,
        peakDecodedBytes,
        openFetches,
        openDecodes,
      };
    },
    async advance(ms) {
      const until = now + ms;
      await nextTurn();
      for (let turns = 0; turns < 100_000; turns++) {
        const next = [...timers.entries()].filter(([, timer]) => timer.at <= until)
          .sort((left, right) => left[1].at - right[1].at || left[0] - right[0])[0];
        if (!next) { now = until; await nextTurn(); return; }
        now = next[1].at;
        timers.delete(next[0]);
        next[1].callback();
        await nextTurn();
      }
      throw new Error('Synthetic timer runaway');
    },
    restore() {
      if (restored) return;
      restored = true;
      for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
      Date.now = originalNow;
      timers.clear();
    },
  };
}

/** UI-independent playhead sampler using the cache's production presentation API. */
export async function sweepAvatar({ cache, network, from, to, durationMs, sampleHz = 60, painted = -1, warm = true }) {
  const samples = [];
  const sampleMs = 1000 / sampleHz;
  const count = Math.ceil(durationMs / sampleMs);
  let longestHoldMs = 0;
  let holdMs = 0;
  let previousTarget;
  let overshoots = 0;
  let peakCacheBytes = cache.stats.decodedBytes;
  for (let step = 0; step <= count; step++) {
    const target = Math.round(from + (to - from) * step / count);
    const direction = Math.sign(to - from) || 1;
    const previousPainted = painted;
    cache.request(target, direction, warm);
    await network.advance(sampleMs);
    const available = cache.nearest(target, painted);
    if (available) painted = available.index;
    if (previousPainted >= 0 && painted >= 0 && (painted < Math.min(previousPainted, target) || painted > Math.max(previousPainted, target))) overshoots++;
    const moving = previousTarget !== undefined && target !== previousTarget;
    if (moving && painted === previousPainted) holdMs += sampleMs;
    else if (painted !== previousPainted) holdMs = 0;
    longestHoldMs = Math.max(longestHoldMs, holdMs);
    const error = painted >= 0 ? Math.abs(target - painted) : 300;
    samples.push({ target, painted, error });
    previousTarget = target;
    peakCacheBytes = Math.max(peakCacheBytes, cache.stats.decodedBytes);
  }
  const errors = samples.map(sample => sample.error).sort((a, b) => a - b);
  const percentage = predicate => Math.round(samples.filter(predicate).length / samples.length * 1000) / 10;
  return {
    painted,
    metrics: {
      samples: samples.length,
      exactPercent: percentage(sample => sample.error === 0),
      withinFourFramesPercent: percentage(sample => sample.error <= 4),
      availablePercent: percentage(sample => sample.painted >= 0),
      meanFrameError: Math.round(errors.reduce((sum, error) => sum + error, 0) / errors.length * 100) / 100,
      p95FrameError: errors[Math.floor((errors.length - 1) * 0.95)],
      maxFrameError: errors.at(-1),
      longestMovingHoldMs: Math.round(longestHoldMs),
      presentationOvershoots: overshoots,
      peakCacheBytes,
    },
  };
}
