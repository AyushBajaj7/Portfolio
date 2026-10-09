import { useEffect, useRef, useSyncExternalStore } from 'react';
import { AvatarFrameCache } from '../../lib/avatarFrames';
import { subscribeScrollTimeline } from '../../lib/scrollTimeline';
import type { ScrollSnapshot } from '../../lib/scrollTimeline';
import { useStore } from '../../store/useStore';

const compactQuery = '(max-width: 767px)';
const subscribeViewport = (listener: () => void) => {
  const media = matchMedia(compactQuery);
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
};
const isCompact = () => matchMedia(compactQuery).matches;

/** Scroll is the playhead. rAF coalesces paints; it never chases a second eased timeline. */
export function Scene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const compactViewport = useSyncExternalStore(subscribeViewport, isCompact, () => false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const context = canvas?.getContext('2d', { alpha: true, desynchronized: true });
    if (!canvas || !container || !context) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const constrained = (device.deviceMemory ?? 8) <= 4 || !!device.connection?.saveData || compactViewport;
    const decodeWidth = constrained ? 960 : 1280;
    const budgetBytes = (constrained ? 24 : 64) * 1024 * 1024;
    let latest: ScrollSnapshot | undefined;
    let raf = 0;
    let disposed = false;
    let target = -1;
    let painted = -1;
    let direction = 1;
    let sizeKey = '';
    let initialScroll: number | undefined;
    let hasScrolled = false;
    let prefetching = false;

    const paint = () => {
      raf = 0;
      if (disposed || document.hidden || !latest) return;
      const next = media.matches ? 68 : Math.round(latest.frame);
      direction = Math.sign(next - target) || direction;
      initialScroll ??= latest.scrollY;
      hasScrolled ||= Math.abs(latest.scrollY - initialScroll) > 1;
      const shouldPrefetch = hasScrolled && !media.matches;
      if (next !== target || shouldPrefetch !== prefetching) {
        target = next;
        prefetching = shouldPrefetch;
        frames.request(target, direction, false, !shouldPrefetch);
      }
      const tier = latest.width < 768 ? 'mobile' : latest.width < 1024 ? 'tablet' : 'desktop';
      const width = container.clientWidth;
      const height = container.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(2_500_000 / Math.max(1, width * height)));
      const nextSizeKey = `${width}:${height}:${dpr}`;
      if (nextSizeKey !== sizeKey) {
        sizeKey = nextSizeKey;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        painted = -1;
      }
      const available = frames.nearest(target, painted);
      if (available && available.index !== painted) {
        const improves = painted < 0 || Math.abs(available.index - target) <= Math.abs(painted - target);
        if (improves) {
          const image = available.image;
          const scale = Math.min(width / image.width, height / image.height) * (tier === 'mobile' ? 1 : 1.12);
          const drawWidth = image.width * scale;
          const drawHeight = image.height * scale;
          context.clearRect(0, 0, width, height);
          context.drawImage(image, (width - drawWidth) / 2, height - drawHeight, drawWidth, drawHeight);
          painted = available.index;
          useStore.getState().setAvatarReady(true);
        }
      }
      const heroPresence = latest.activeSection === 'hero' ? 1 - latest.sectionProgress : 0;
      canvas.style.opacity = tier === 'mobile' ? String(0.08 + heroPresence * 0.14) : tier === 'tablet' ? '0.18' : '1';
      canvas.dataset.targetFrame = String(target);
      canvas.dataset.paintedFrame = String(painted);
      canvas.dataset.section = latest.activeSection;
      canvas.dataset.cacheFrames = String(frames.stats.frames);
      canvas.dataset.decodedMb = (frames.stats.decodedBytes / 1024 / 1024).toFixed(1);
      canvas.dataset.inFlight = String(frames.stats.inFlight);
      canvas.dataset.source = constrained ? 'frames-lowres' : 'frames';
      canvas.dataset.motion = media.matches ? 'reduced' : 'scroll';
    };
    const schedulePaint = () => { if (!raf && !disposed && !document.hidden) raf = requestAnimationFrame(paint); };
    const frames = new AvatarFrameCache({
      baseUrl: import.meta.env.BASE_URL, sourceDirectory: constrained ? 'frames-lowres' : 'frames', decodeWidth, budgetBytes,
      concurrency: constrained ? 2 : 3, radius: constrained ? 2 : 4, onReady: schedulePaint,
    });
    frames.pause(document.hidden);
    const unsubscribe = subscribeScrollTimeline(value => {
      latest = value;
      cancelAnimationFrame(raf);
      paint();
    });
    const sizeObserver = new ResizeObserver(schedulePaint);
    sizeObserver.observe(container);
    const visibility = () => {
      frames.pause(document.hidden);
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
      else schedulePaint();
    };
    const motionChange = () => {
      frames.pause(true);
      target = -1;
      paint();
      frames.pause(document.hidden);
    };
    media.addEventListener('change', motionChange);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      disposed = true;
      unsubscribe();
      cancelAnimationFrame(raf);
      sizeObserver.disconnect();
      media.removeEventListener('change', motionChange);
      document.removeEventListener('visibilitychange', visibility);
      frames.dispose();
    };
  }, [compactViewport]);

  return <div ref={containerRef} className="canvas-container" aria-hidden="true">
    <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', opacity: 0 }} />
  </div>;
}

export default Scene;
