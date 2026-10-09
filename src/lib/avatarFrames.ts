/** Bounded decode cache. Completion invalidates the canvas; loaders never paint. */
export type DecodedFrame = ImageBitmap | HTMLImageElement;
type CachedFrame = { image: DecodedFrame; bytes: number };
type FrameOptions = { baseUrl: string; sourceDirectory?: 'frames' | 'frames-lowres'; decodeWidth: number; budgetBytes: number; concurrency: number; radius: number; onReady: () => void };
export const FRAME_COUNT = 300;
const ANCHORS = [0, 68, 88, 175, 212, 254, 284, 299];
const release = (image: DecodedFrame) => { if ('close' in image) image.close(); };

export class AvatarFrameCache {
  private cache = new Map<number, CachedFrame>();
  private pending = new Map<number, AbortController>();
  private failed = new Map<number, number>();
  private attempts = new Map<number, number>();
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private queue: number[] = [];
  private wanted = new Set<number>();
  private disposed = false;
  private bytes = 0;
  private target = 0;
  private direction = 1;
  private warmed = false;
  private paused = false;
  private options: FrameOptions;
  constructor(options: FrameOptions) { this.options = options; }

  request(target: number, direction: number, warm = false, still = false) {
    this.target = Math.min(FRAME_COUNT - 1, Math.max(0, Math.round(target)));
    this.direction = direction || this.direction;
    this.warmed ||= warm;
    const requested = [this.target];
    for (let offset = 1; offset <= (still ? 0 : this.options.radius); offset++) {
      requested.push(this.target + offset * this.direction, this.target - offset * this.direction);
    }
    if (this.warmed && !still) requested.push(...(this.options.decodeWidth < 1280 ? [0, 88, 175, 254, 299] : ANCHORS));
    this.queue = [...new Set(requested)].filter(index => index >= 0 && index < FRAME_COUNT);
    this.wanted = new Set(this.queue);
    for (const [index, controller] of this.pending) {
      if (!this.wanted.has(index)) controller.abort();
    }
    this.pump();
  }

  nearest(target: number, painted = -1): { index: number; image: DecodedFrame } | undefined {
    let best: { index: number; image: DecodedFrame } | undefined;
    let distance = Infinity;
    for (const [index, entry] of this.cache) {
      // Stay between the displayed frame and the playhead. Future anchors must
      // never overshoot and then replay an expression when exact decoding finishes.
      if (painted >= 0 && (index < Math.min(painted, target) || index > Math.max(painted, target))) continue;
      if (painted < 0 && index !== target) continue;
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
      for (const controller of this.pending.values()) controller.abort();
    }
    else {
      this.queue = [...this.wanted];
      this.pump();
    }
  }

  get stats() { return { frames: this.cache.size, decodedBytes: this.bytes, inFlight: this.pending.size, queued: this.queue.length }; }

  private evict() {
    while (this.bytes > this.options.budgetBytes && this.cache.size > 1) {
      let victim = -1;
      let distance = -Infinity;
      for (const index of this.cache.keys()) {
        if (index === this.target) continue;
        const score = Math.abs(index - this.target) - (this.warmed && ANCHORS.includes(index) ? FRAME_COUNT : 0);
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
    while (this.pending.size < this.options.concurrency) {
      const next = this.queue.find(index => !this.cache.has(index) && !this.pending.has(index) && (this.attempts.get(index) ?? 0) < 3 && Date.now() - (this.failed.get(index) ?? 0) >= 1000);
      if (next === undefined) {
        const retries = this.queue.filter(index => !this.cache.has(index) && !this.pending.has(index) && (this.attempts.get(index) ?? 0) < 3 && this.failed.has(index));
        if (retries.length && !this.retryTimer) {
          const delay = Math.max(1, Math.min(...retries.map(index => (this.failed.get(index) ?? 0) + 1050 - Date.now())));
          this.retryTimer = setTimeout(() => { this.retryTimer = undefined; this.pump(); }, delay);
        }
        break;
      }
      this.queue = this.queue.filter(index => index !== next);
      const controller = new AbortController();
      this.pending.set(next, controller);
      void this.load(next, controller);
    }
  }

  private async load(index: number, controller: AbortController) {
    let image: DecodedFrame | undefined;
    try {
      const response = await fetch(`${this.options.baseUrl}${this.options.sourceDirectory ?? 'frames'}/male${String(index + 1).padStart(4, '0')}.webp`, { signal: controller.signal, priority: index === this.target ? 'high' : 'low' });
      if (!response.ok) throw new Error(`Avatar frame HTTP ${response.status}`);
      const blob = await response.blob();
      if (controller.signal.aborted || this.disposed) return;
      if (typeof createImageBitmap === 'function') {
        try { image = await createImageBitmap(blob, { resizeWidth: this.options.decodeWidth, resizeHeight: Math.round(this.options.decodeWidth * 9 / 16), resizeQuality: 'high' }); }
        catch { /* Older engines may reject bitmap resize options; decode the same source below. */ }
      }
      if (!image) {
        const url = URL.createObjectURL(blob);
        try {
          const element = new Image();
          element.decoding = 'async';
          element.src = url;
          await element.decode();
          image = element;
        } finally { URL.revokeObjectURL(url); }
      }
      if (this.disposed || controller.signal.aborted || !this.wanted.has(index)) { release(image); return; }
      const bytes = image.width * image.height * 4;
      this.cache.set(index, { image, bytes });
      this.bytes += bytes;
      this.attempts.delete(index);
      this.failed.delete(index);
      this.evict();
      this.options.onReady();
    } catch {
      if (!controller.signal.aborted) {
        this.failed.set(index, Date.now());
        this.attempts.set(index, (this.attempts.get(index) ?? 0) + 1);
        if (this.wanted.has(index) && (this.attempts.get(index) ?? 0) < 3) {
          this.queue.push(index);
          clearTimeout(this.retryTimer);
          this.retryTimer = setTimeout(() => { this.retryTimer = undefined; this.pump(); }, 1050);
        }
      }
    } finally {
      this.pending.delete(index);
      if (controller.signal.aborted && this.wanted.has(index) && !this.disposed) this.queue.unshift(index);
      this.pump();
    }
  }

  dispose() {
    this.disposed = true;
    clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
    this.queue = [];
    for (const controller of this.pending.values()) controller.abort();
    for (const entry of this.cache.values()) release(entry.image);
    this.cache.clear();
    this.bytes = 0;
  }
}
