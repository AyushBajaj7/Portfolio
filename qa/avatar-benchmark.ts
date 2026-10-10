import { AvatarFrameCache } from '../src/lib/avatarFrames';

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const runButton = get<HTMLButtonElement>('run');
const stopButton = get<HTMLButtonElement>('stop');
const profileControl = get<HTMLSelectElement>('profile');
const latencyControl = get<HTMLInputElement>('latency');
const progress = get('progress');
const results = get('results');
const canvas = get<HTMLCanvasElement>('avatar');
const context = canvas.getContext('2d', { alpha: true })!;
let stopCurrent: (() => void) | undefined;

type Phase = { name: string; duration: number; from: number; to: number; warm: boolean; still?: boolean };
type PhaseMetrics = {
  samples: number; withinFourFrames: number; exact: number; missing: number;
  maxFrameError: number; longestMovingHoldMs: number; presentationOvershoots: number;
  draws: number; drawMs: number; maxDrawMs: number; rafGapsOver33ms: number; rafGapsOver50ms: number;
};
const emptyMetrics = (): PhaseMetrics => ({
  samples: 0, withinFourFrames: 0, exact: 0, missing: 0,
  maxFrameError: 0, longestMovingHoldMs: 0, presentationOvershoots: 0,
  draws: 0, drawMs: 0, maxDrawMs: 0, rafGapsOver33ms: 0, rafGapsOver50ms: 0,
});
const round = (value: number) => Math.round(value * 100) / 100;

runButton.addEventListener('click', () => {
  if (stopCurrent) return;
  const constrained = profileControl.value === 'mobile';
  const latencyMs = Math.max(0, Math.min(1000, Number(latencyControl.value) || 0));
  const options = {
    baseUrl: import.meta.env.BASE_URL,
    sourceDirectory: 'frames-lowres' as const,
    decodeWidth: constrained ? 640 : 960,
    budgetBytes: (constrained ? 64 : 192) * 1024 * 1024,
    concurrency: constrained ? 3 : 4,
    decodeConcurrency: 2,
    radius: constrained ? 8 : 12,
    coverageStep: constrained ? 8 : 4,
    onReady: () => {},
  };
  const phases: Phase[] = [
    { name: 'startup', duration: 400, from: 0, to: 0, warm: false, still: true },
    { name: 'coldForward', duration: 5000, from: 0, to: 299, warm: true },
    { name: 'coverageWarmup', duration: 6000, from: 299, to: 299, warm: true },
    { name: 'warmReverse', duration: 5000, from: 299, to: 0, warm: true },
    { name: 'warmForward', duration: 5000, from: 0, to: 299, warm: true },
    { name: 'rapidReverse1', duration: 600, from: 299, to: 100, warm: true },
    { name: 'rapidForward1', duration: 600, from: 100, to: 220, warm: true },
    { name: 'rapidReverse2', duration: 600, from: 220, to: 20, warm: true },
    { name: 'rapidForward2', duration: 600, from: 20, to: 280, warm: true },
    { name: 'rapidReverse3', duration: 600, from: 280, to: 150, warm: true },
  ];
  const nativeFetch = window.fetch.bind(window);
  const nativeBitmap = window.createImageBitmap.bind(window);
  const requests = new Map<string, number>();
  const transport = { requests: 0, completed: 0, aborted: 0, repeated: 0, active: 0, peakActive: 0 };
  const decoding = { count: 0, active: 0, peakActive: 0, totalMs: 0, maxMs: 0 };
  const phaseResults: Record<string, unknown> = {};
  let stopped = false;
  const cache = new AvatarFrameCache(options);
  let raf = 0;
  let painted = -1;
  let lastRequested = -1;
  let phaseIndex = 0;
  let phaseStarted = performance.now();
  const started = phaseStarted;
  let lastTick = phaseStarted;
  let lastDraw = phaseStarted;
  let lastUi = 0;
  let firstPaintMs: number | null = null;
  let phaseMetrics = emptyMetrics();
  let peakCacheBytes = 0;

  window.fetch = async (input, init) => {
    const url = String(input);
    if (!/\/frames[^/]*\/male\d+\.webp/.test(url)) return nativeFetch(input, init);
    transport.requests++;
    const previous = requests.get(url) ?? 0;
    requests.set(url, previous + 1);
    if (previous) transport.repeated++;
    transport.active++;
    transport.peakActive = Math.max(transport.peakActive, transport.active);
    try {
      await new Promise<void>((resolve, reject) => {
        const signal = init?.signal;
        const abort = () => { clearTimeout(timer); reject(new DOMException('Benchmark request aborted', 'AbortError')); };
        const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, latencyMs);
        signal?.addEventListener('abort', abort, { once: true });
        if (signal?.aborted) abort();
      });
      const response = await nativeFetch(input, init);
      transport.completed++;
      return response;
    } catch (error) {
      if (init?.signal?.aborted) transport.aborted++;
      throw error;
    } finally { transport.active--; }
  };
  window.createImageBitmap = (async (...args: unknown[]) => {
    const start = performance.now();
    decoding.count++;
    decoding.active++;
    decoding.peakActive = Math.max(decoding.peakActive, decoding.active);
    try { return await Reflect.apply(nativeBitmap, window, args); }
    finally {
      decoding.active--;
      const elapsed = performance.now() - start;
      decoding.totalMs += elapsed;
      decoding.maxMs = Math.max(decoding.maxMs, elapsed);
    }
  }) as typeof createImageBitmap;

  const recordPhase = () => {
    phaseResults[phases[phaseIndex].name] = {
      ...phaseMetrics,
      exactPercent: round(phaseMetrics.exact / Math.max(1, phaseMetrics.samples) * 100),
      withinFourFramesPercent: round(phaseMetrics.withinFourFrames / Math.max(1, phaseMetrics.samples) * 100),
      meanDrawMs: round(phaseMetrics.drawMs / Math.max(1, phaseMetrics.draws)),
      maxDrawMs: round(phaseMetrics.maxDrawMs),
      longestMovingHoldMs: round(phaseMetrics.longestMovingHoldMs),
      cache: { ...cache.stats },
      transport: { ...transport },
    };
  };
  const finish = (reason: string) => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    recordPhase();
    const report = {
      reason, profile: constrained ? 'constrained' : 'desktop', latencyMs,
      scope: 'Actual browser decode/canvas, scheduled target trajectory, local assets plus added per-request latency. Not a full-page or hosted-network FPS benchmark.',
      elapsedMs: round(performance.now() - started), firstPaintMs: firstPaintMs === null ? null : round(firstPaintMs),
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      peakCacheBytes, transport: { ...transport }, decoding: { ...decoding, meanMs: round(decoding.totalMs / Math.max(1, decoding.count)) },
      phases: phaseResults,
    };
    cache.dispose();
    window.fetch = nativeFetch;
    window.createImageBitmap = nativeBitmap;
    stopCurrent = undefined;
    runButton.disabled = false;
    stopButton.disabled = true;
    profileControl.disabled = false;
    latencyControl.disabled = false;
    results.textContent = JSON.stringify(report, null, 2);
    progress.textContent = `${reason}. Results below. Cache disposed and browser functions restored.`;
    document.removeEventListener('visibilitychange', visibility);
  };
  const visibility = () => { if (document.hidden) finish('Invalidated: tab was hidden'); };
  const tick = (now: number) => {
    if (stopped) return;
    const phase = phases[phaseIndex];
    const fraction = Math.min(1, (now - phaseStarted) / phase.duration);
    const target = Math.round(phase.from + (phase.to - phase.from) * fraction);
    if (target !== lastRequested || phaseMetrics.samples === 0) {
      cache.request(target, Math.sign(phase.to - phase.from) || 1, phase.warm, phase.still);
      lastRequested = target;
    }
    const prior = painted;
    const available = cache.nearest(target, painted);
    if (available && available.index !== painted) {
      const drawStarted = performance.now();
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(available.image, 0, 0, canvas.width, canvas.height);
      const drawMs = performance.now() - drawStarted;
      phaseMetrics.draws++;
      phaseMetrics.drawMs += drawMs;
      phaseMetrics.maxDrawMs = Math.max(phaseMetrics.maxDrawMs, drawMs);
      painted = available.index;
      lastDraw = now;
      firstPaintMs ??= now - started;
    }
    if (prior >= 0 && painted >= 0 && (painted < Math.min(prior, target) || painted > Math.max(prior, target))) phaseMetrics.presentationOvershoots++;
    if (phase.from !== phase.to && painted !== target) phaseMetrics.longestMovingHoldMs = Math.max(phaseMetrics.longestMovingHoldMs, now - lastDraw);
    const error = painted < 0 ? 300 : Math.abs(target - painted);
    phaseMetrics.samples++;
    if (error <= 4) phaseMetrics.withinFourFrames++;
    if (error === 0) phaseMetrics.exact++;
    if (painted < 0) phaseMetrics.missing++;
    phaseMetrics.maxFrameError = Math.max(phaseMetrics.maxFrameError, error);
    if (now - lastTick > 33.4) phaseMetrics.rafGapsOver33ms++;
    if (now - lastTick > 50) phaseMetrics.rafGapsOver50ms++;
    lastTick = now;
    peakCacheBytes = Math.max(peakCacheBytes, cache.stats.decodedBytes);
    if (now - lastUi > 150) {
      lastUi = now;
      progress.textContent = `${phase.name} · ${round((now - started) / 1000)}s / 25s\nTarget ${target} · painted ${painted} · lag ${error} frames\nDecoded ${round(cache.stats.decodedBytes / 1024 / 1024)} MiB · requests ${transport.requests} · aborts ${transport.aborted}`;
    }
    if (fraction >= 1) {
      if (phaseIndex === phases.length - 1) { finish('Completed'); return; }
      recordPhase();
      phaseIndex++;
      phaseStarted = now;
      lastDraw = now;
      phaseMetrics = emptyMetrics();
    }
    raf = requestAnimationFrame(tick);
  };
  context.clearRect(0, 0, canvas.width, canvas.height);
  results.textContent = 'Running. Results include separate cold and warm phases.';
  runButton.disabled = true;
  stopButton.disabled = false;
  profileControl.disabled = true;
  latencyControl.disabled = true;
  stopCurrent = () => finish('Stopped by user');
  document.addEventListener('visibilitychange', visibility);
  raf = requestAnimationFrame(tick);
});
stopButton.addEventListener('click', () => stopCurrent?.());
