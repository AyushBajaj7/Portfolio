import { BOOTSTRAP_INDICES, readAvatarBootstrap } from './avatarBootstrap.ts';

/** Download once, retain a decoded timeline backbone, and decode detail near the playhead.
 * Loading never paints: only the scroll renderer may choose a displayed frame.
 */
export type DecodedFrame = ImageBitmap | HTMLImageElement | HTMLCanvasElement;
type CachedFrame = { image: DecodedFrame; bytes: number };
type FrameOptions = {
  baseUrl: string; sourceDirectory?: 'frames' | 'frames-lowres'; decodeWidth: number;
  budgetBytes: number; concurrency: number; decodeConcurrency?: number; radius: number;
  coverageStep?: number; compressedBudgetBytes?: number; prefetchAll?: boolean; onReady: () => void;
  bootstrapUrl?: string; requestTimeoutMs?: number;
  crop?: { x: number; y: number; width: number; height: number; stageWidth: number; stageHeight: number };
};
export const FRAME_COUNT = 300;
const release = (image: DecodedFrame) => {
  if ('close' in image) image.close();
  else if ('getContext' in image) { image.width = 0; image.height = 0; }
};

// Fill the whole timeline progressively, rather than leaving its end unprepared.
function spread(indices: number[]): number[] {
  if (indices.length <= 2) return indices;
  const result = [indices[0], indices.at(-1)!];
  let spans = [[1, indices.length - 2]];
  while (spans.length) {
    const next: number[][] = [];
    for (const [lo, hi] of spans) {
      if (lo > hi) continue;
      const middle = Math.floor((lo + hi) / 2);
      result.push(indices[middle]);
      next.push([lo, middle - 1], [middle + 1, hi]);
    }
    spans = next;
  }
  return result;
}

export class AvatarFrameCache {
  private cache = new Map<number, CachedFrame>();
  private blobs = new Map<number, Blob>();
  private downloaded = new Set<number>();
  private pending = new Map<number, AbortController>();
  private decoding = new Set<number>();
  private failed = new Map<number, number>();
  private attempts = new Map<number, number>();
  private unavailableAnchors = new Set<number>();
  private bootstrapState: 'idle' | 'loading' | 'ready' | 'fallback' = 'idle';
  private timeouts = 0;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private wanted: number[] = [];
  private fetchAhead: number[] = [];
  private lastRequestAt = 0;
  private fetchLatency = 120;
  private anchors: number[];
  private anchorSet: Set<number>;
  private allFrames = spread(Array.from({ length: FRAME_COUNT }, (_, i) => i));
  private disposed = false;
  private bytes = 0;
  private compressedBytes = 0;
  private target = 0;
  private warmed = false;
  private still = false;
  private paused = false;
  private fetches = 0;
  private aborts = 0;
  private decodes = 0;
  private maxFrames: number;
  private imageWidth: number;
  private imageHeight: number;
  private options: FrameOptions;

  constructor(options: FrameOptions) {
    this.options = options;
    this.imageWidth = Math.round(options.decodeWidth * (options.crop ? options.crop.width / options.crop.stageWidth : 1));
    this.imageHeight = Math.round(options.decodeWidth * (options.crop ? options.crop.height / options.crop.stageWidth : 9 / 16));
    const frameBytes = this.imageWidth * this.imageHeight * 4;
    this.maxFrames = Math.max(1, Math.floor(options.budgetBytes / frameBytes));
    let step = Math.max(4, Math.ceil((options.coverageStep ?? 4) / 4) * 4);
    // Reserve room for nearby detail; low-memory profiles use fewer same-quality anchors.
    while (Math.ceil(FRAME_COUNT / step) + 1 > Math.max(2, this.maxFrames * 0.8)) step += 4;
    this.anchors = this.maxFrames < 3 ? [] : spread([...new Set([...Array.from({ length: Math.ceil(FRAME_COUNT / step) }, (_, i) => i * step), FRAME_COUNT - 1])]);
    this.anchorSet = new Set(this.anchors);
  }

  request(target: number, direction: number, warm = false, still = false) {
    if (this.disposed) return;
    const nextTarget = Math.min(FRAME_COUNT - 1, Math.max(0, Math.round(target)));
    const now = Date.now();
    const elapsed = now - this.lastRequestAt;
    const velocity = elapsed > 0 && elapsed < 250 ? (nextTarget - this.target) / elapsed : 0;
    this.lastRequestAt = now;
    this.target = nextTarget;
    this.warmed ||= warm;
    this.still = still;
    const requested = [this.target];
    const localSlots = Math.max(1, this.maxFrames - (this.warmed && !still ? this.anchors.length : 0));
    const radius = still ? 0 : Math.min(this.options.radius, Math.floor((localSlots - 1) / 2));
    for (let offset = 1; offset <= radius; offset++) requested.push(this.target + offset * (direction || 1), this.target - offset * (direction || 1));
    this.wanted = requested.filter(index => index >= 0 && index < FRAME_COUNT);
    // Download toward the likely arrival position on a cold connection. This only
    // changes fetch priority, never the scroll playhead or the presentation guard.
    const lead = Math.min(36, Math.ceil(Math.abs(velocity) * (this.fetchLatency + 16)));
    const ahead = this.target + lead * Math.sign(velocity);
    this.fetchAhead = this.warmed && !still && lead > 1 ? [ahead, ahead + (direction || 1) * 2, ahead - (direction || 1) * 2].filter(index => index >= 0 && index < FRAME_COUNT) : [];
    // Never cancel useful transfers on a scroll update. Queued priorities follow the
    // newest target; completed compressed data remains reusable in either direction.
    this.pump();
  }

  nearest(target: number, painted = -1): { index: number; image: DecodedFrame } | undefined {
    let best: { index: number; image: DecodedFrame } | undefined;
    let distance = Infinity;
    for (const [index, entry] of this.cache) {
      // Do not play a future expression early, then replay it when detail arrives.
      if (painted >= 0 && (index < Math.min(painted, target) || index > Math.max(painted, target))) continue;
      if (painted < 0 && index > target) continue;
      const next = Math.abs(index - target);
      if (next < distance) { distance = next; best = { index, image: entry.image }; }
    }
    return best;
  }

  pause(value: boolean) {
    this.paused = value;
    if (value) {
      clearTimeout(this.retryTimer);
      this.retryTimer = undefined;
      for (const controller of this.pending.values()) {
        if (!controller.signal.aborted) { this.aborts++; controller.abort(); }
      }
    } else this.pump();
  }

  get stats() {
    return {
      frames: this.cache.size, decodedBytes: this.bytes, compressedBytes: this.compressedBytes,
      compressedFrames: this.blobs.size, inFlight: this.pending.size, decoding: this.decoding.size,
      queued: this.disposed ? 0 : this.wanted.filter(index => !this.cache.has(index)).length,
      anchorFrames: this.anchors.filter(index => this.cache.has(index)).length,
      anchorTotal: this.anchors.length, fetches: this.fetches, aborts: this.aborts, decodes: this.decodes,
      bootstrap: this.bootstrapState, timeouts: this.timeouts,
    };
  }

  private eligible(index: number) {
    return (this.attempts.get(index) ?? 0) < 3 && (!this.failed.has(index) || Date.now() - this.failed.get(index)! >= 1000);
  }

  private evict() {
    while (this.bytes > this.options.budgetBytes && this.cache.size > 1) {
      let victim = -1;
      let distance = -Infinity;
      for (const index of this.cache.keys()) {
        if (index === this.target) continue;
        const score = Math.abs(index - this.target) - (this.warmed && this.anchorSet.has(index) ? FRAME_COUNT * 2 : 0);
        if (score > distance) { distance = score; victim = index; }
      }
      const entry = this.cache.get(victim);
      if (!entry) break;
      this.bytes -= entry.bytes;
      release(entry.image);
      this.cache.delete(victim);
    }
  }

  private pump() {
    if (this.disposed || this.paused) return;
    if (this.warmed && !this.still && this.options.bootstrapUrl && this.bootstrapState === 'idle' && this.pending.size < this.options.concurrency) void this.fetchBootstrap();
    const coverage = this.warmed && !this.still ? this.anchors : [];
    const background = coverage.length ? [...coverage, ...(this.options.prefetchAll === false ? [] : this.allFrames)].filter(index => !this.downloaded.has(index)) : [];
    const canFetch = (index: number) => !this.blobs.has(index) && !this.pending.has(index) && this.eligible(index)
      && !(this.bootstrapState === 'loading' && BOOTSTRAP_INDICES.has(index) && index !== this.target);
    while (this.pending.size < this.options.concurrency) {
      const local = this.wanted.find(canFetch);
      const ahead = this.fetchAhead.find(canFetch);
      const remote = background.find(canFetch);
      // Reserve one in four slots for timeline coverage. While moving, alternate
      // arrival-position prefetch with exact/nearby work instead of chasing old frames.
      const slot = this.fetches % 4;
      const next = slot === 3 ? remote ?? ahead ?? local : slot === 1 || slot === 2 ? ahead ?? local ?? remote : local ?? ahead ?? remote;
      if (next === undefined) break;
      const controller = new AbortController();
      this.pending.set(next, controller);
      this.fetches++;
      void this.fetchFrame(next, controller);
    }
    const canDecode = (index: number) => this.blobs.has(index) && !this.cache.has(index) && !this.decoding.has(index) && this.eligible(index);
    while (this.decoding.size < (this.options.decodeConcurrency ?? 2)) {
      const local = this.wanted.find(canDecode);
      const anchor = coverage.find(canDecode);
      const next = this.decodes % 3 === 2 ? anchor ?? local : local ?? anchor;
      if (next === undefined) break;
      this.decoding.add(next);
      this.decodes++;
      void this.decodeFrame(next, this.blobs.get(next)!);
    }
    const retry = [...new Set([...this.wanted, ...coverage, ...background])].filter(index => this.failed.has(index) && !this.pending.has(index) && !this.decoding.has(index) && (this.attempts.get(index) ?? 0) < 3);
    if (retry.length && !this.retryTimer) {
      const delay = Math.max(1, Math.min(...retry.map(index => this.failed.get(index)! + 1050 - Date.now())));
      this.retryTimer = setTimeout(() => { this.retryTimer = undefined; this.pump(); }, delay);
    }
  }

  private fail(index: number) {
    this.failed.set(index, Date.now());
    this.attempts.set(index, (this.attempts.get(index) ?? 0) + 1);
  }

  /** Covers headers AND body consumption; cancellation always frees its queue slot. */
  private async withDeadline<T>(controller: AbortController, operation: () => Promise<T>): Promise<T> {
    if (controller.signal.aborted) throw controller.signal.reason;
    let onAbort: () => void = () => {};
    const cancelled = new Promise<never>((_, reject) => {
      onAbort = () => reject(controller.signal.reason ?? new DOMException('Aborted', 'AbortError'));
      controller.signal.addEventListener('abort', onAbort, { once: true });
    });
    const timer = setTimeout(() => {
      this.timeouts++;
      this.aborts++;
      controller.abort(new DOMException('Avatar request timed out', 'TimeoutError'));
    }, this.options.requestTimeoutMs ?? 8000);
    try { return await Promise.race([operation(), cancelled]); }
    finally { clearTimeout(timer); controller.signal.removeEventListener('abort', onAbort); }
  }

  private retainBlob(index: number, blob: Blob) {
    if (this.blobs.has(index)) return;
    this.blobs.set(index, blob);
    this.downloaded.add(index);
    this.compressedBytes += blob.size;
    const limit = this.options.compressedBudgetBytes ?? 12 * 1024 * 1024;
    for (const [victim, data] of this.blobs) {
      if (this.compressedBytes <= limit) break;
      if (victim === index || this.decoding.has(victim)) continue;
      this.blobs.delete(victim);
      this.compressedBytes -= data.size;
    }
  }

  private async fetchBootstrap() {
    const controller = new AbortController();
    this.bootstrapState = 'loading';
    this.pending.set(-1, controller);
    this.fetches++;
    try {
      const buffer = await this.withDeadline(controller, async () => {
        const response = await fetch(this.options.bootstrapUrl!, { signal: controller.signal, priority: 'high' });
        if (!response.ok) throw new Error(`Avatar bootstrap HTTP ${response.status}`);
        return response.arrayBuffer();
      });
      if (this.disposed || controller.signal.aborted) return;
      for (const { index, blob } of readAvatarBootstrap(buffer)) {
        this.retainBlob(index, blob);
        this.failed.delete(index);
        this.attempts.delete(index);
      }
      this.bootstrapState = 'ready';
    } catch {
      // Older deployments and interrupted connections still have individual frames.
      this.bootstrapState = !this.disposed && controller.signal.reason?.name === 'AbortError' ? 'idle' : 'fallback';
    } finally {
      this.pending.delete(-1);
      this.pump();
    }
  }

  private async fetchFrame(index: number, controller: AbortController) {
    const started = Date.now();
    try {
      const directory = this.warmed && this.anchorSet.has(index) && !this.unavailableAnchors.has(index) && this.options.sourceDirectory !== 'frames' ? 'frames-anchors' : this.options.sourceDirectory ?? 'frames-lowres';
      const blob = await this.withDeadline(controller, async () => {
        const load = async (source: string) => {
          const response = await fetch(`${this.options.baseUrl}${source}/male${String(index + 1).padStart(4, '0')}.webp`, { signal: controller.signal, priority: index === this.target ? 'high' : 'low' });
          if (!response.ok) throw new Error(`Avatar frame HTTP ${response.status}`);
          return response.blob();
        };
        try { return await load(directory); }
        catch (error) {
          if (directory !== 'frames-anchors' || controller.signal.aborted) throw error;
          this.unavailableAnchors.add(index);
          return load('frames-lowres');
        }
      });
      if (controller.signal.aborted || this.disposed) return;
      this.fetchLatency = this.fetchLatency * 0.75 + Math.min(1000, Date.now() - started) * 0.25;
      this.retainBlob(index, blob);
      this.failed.delete(index);
      this.attempts.delete(index);
    } catch (error) {
      if (!this.disposed && !this.paused && (!controller.signal.aborted || (error instanceof DOMException && error.name === 'TimeoutError'))) this.fail(index);
    } finally {
      this.pending.delete(index);
      this.pump();
    }
  }

  private async decodeFrame(index: number, blob: Blob) {
    let image: DecodedFrame | undefined;
    try {
      if (typeof createImageBitmap === 'function') {
        try {
          const resize = { resizeWidth: this.imageWidth, resizeHeight: this.imageHeight, resizeQuality: 'high' as const };
          const crop = this.options.crop;
          if (crop) {
            const sourceScale = (this.options.sourceDirectory === 'frames' ? 1280 : 960) / crop.stageWidth;
            image = await createImageBitmap(blob, Math.round(crop.x * sourceScale), Math.round(crop.y * sourceScale), Math.round(crop.width * sourceScale), Math.round(crop.height * sourceScale), resize);
          } else image = await createImageBitmap(blob, resize);
        }
        catch { /* Safari versions without bitmap resize support use the same fixed tier below. */ }
      }
      if (!image) {
        const url = URL.createObjectURL(blob);
        try {
          const element = new Image();
          element.decoding = 'async';
          element.src = url;
          await element.decode();
          const resized = document.createElement('canvas');
          resized.width = this.imageWidth;
          resized.height = this.imageHeight;
          const context = resized.getContext('2d');
          if (!context) throw new Error('Unable to decode avatar');
          const crop = this.options.crop;
          const scale = crop ? element.naturalWidth / crop.stageWidth : 1;
          context.drawImage(element, (crop?.x ?? 0) * scale, (crop?.y ?? 0) * scale,
            crop ? crop.width * scale : element.naturalWidth, crop ? crop.height * scale : element.naturalHeight,
            0, 0, resized.width, resized.height);
          image = resized;
        } finally { URL.revokeObjectURL(url); }
      }
      if (this.disposed) { release(image); return; }
      // Late decodes are useful cache entries, never instructions to show old frames.
      const bytes = image.width * image.height * 4;
      this.cache.set(index, { image, bytes });
      this.bytes += bytes;
      this.failed.delete(index);
      this.attempts.delete(index);
      this.evict();
      this.options.onReady();
    } catch {
      if (!this.disposed) this.fail(index);
    } finally {
      this.decoding.delete(index);
      this.pump();
    }
  }

  dispose() {
    this.disposed = true;
    this.pause(true);
    this.wanted = [];
    this.fetchAhead = [];
    for (const entry of this.cache.values()) release(entry.image);
    this.cache.clear();
    this.blobs.clear();
    this.downloaded.clear();
    this.bytes = 0;
    this.compressedBytes = 0;
  }
}
