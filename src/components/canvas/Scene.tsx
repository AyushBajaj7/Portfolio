import { useEffect, useRef } from 'react';
import { AvatarFrameCache } from '../../lib/avatarFrames';
import { AVATAR_CROP, avatarProfile } from '../../lib/avatarProfile';
import { subscribeScrollTimeline } from '../../lib/scrollTimeline';
import type { ScrollSnapshot } from '../../lib/scrollTimeline';
import { useStore } from '../../store/useStore';

/** Scroll is the playhead. rAF coalesces paints; it never chases a second eased timeline. */
export function Scene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const context = canvas?.getContext('2d', { alpha: true, desynchronized: true });
    if (!canvas || !container || !context) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    // Choose once per visit. Resizing must not throw away a fully prepared timeline.
    const coarsePointer = matchMedia('(pointer: coarse)').matches;
    const profile = avatarProfile({ width: window.innerWidth, coarsePointer, memory: device.deviceMemory, saveData: device.connection?.saveData });
    let latest: ScrollSnapshot | undefined;
    let raf = 0;
    let disposed = false;
    let target = -1;
    let painted = -1;
    let direction = 1;
    let sizeKey = '';
    let width = container.clientWidth;
    let height = container.clientHeight;
    let warm = false;
    let requestedWarm = false;
    let requestedStill = false;
    let warmTimer: ReturnType<typeof setTimeout> | undefined;
    let initialScroll: number | undefined;

    const paint = () => {
      raf = 0;
      if (disposed || document.hidden || !latest) return;
      const next = media.matches ? 68 : Math.round(latest.frame);
      direction = Math.sign(next - target) || direction;
      initialScroll ??= latest.scrollY;
      if (!media.matches && Math.abs(latest.scrollY - initialScroll) > 1) warm = true;
      const shouldWarm = warm && !media.matches;
      const still = media.matches || !shouldWarm;
      if (next !== target || shouldWarm !== requestedWarm || still !== requestedStill) {
        target = next;
        requestedWarm = shouldWarm;
        requestedStill = still;
        frames.request(target, direction, shouldWarm, still);
      }
      const tier = latest.width < 768 ? 'mobile' : latest.width < 1024 || coarsePointer ? 'tablet' : 'desktop';
      // No per-scroll layout reads. ResizeObserver owns geometry; cap the backing store.
      const scale = Math.min(width / AVATAR_CROP.stageWidth, height / AVATAR_CROP.stageHeight) * (tier === 'mobile' ? 1 : 1.12);
      const drawWidth = AVATAR_CROP.width * scale;
      const drawHeight = AVATAR_CROP.height * scale;
      const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt((profile.constrained ? 700_000 : 1_400_000) / Math.max(1, drawWidth * drawHeight)));
      const nextSizeKey = `${width}:${height}:${dpr}:${tier}`;
      const resized = nextSizeKey !== sizeKey;
      const available = frames.nearest(target, painted);
      // Keep the previous canvas intact until a usable bitmap is available to redraw.
      if (available && (available.index !== painted || resized)) {
        if (resized) {
          sizeKey = nextSizeKey;
          canvas.width = Math.round(drawWidth * dpr);
          canvas.height = Math.round(drawHeight * dpr);
          canvas.style.width = `${drawWidth}px`;
          canvas.style.height = `${drawHeight}px`;
          canvas.style.left = `${(width - AVATAR_CROP.stageWidth * scale) / 2 + AVATAR_CROP.x * scale}px`;
          canvas.style.top = `${height - AVATAR_CROP.stageHeight * scale + AVATAR_CROP.y * scale}px`;
          context.setTransform(dpr, 0, 0, dpr, 0, 0);
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = 'high';
        }
        const image = available.image;
        context.clearRect(0, 0, drawWidth, drawHeight);
        context.drawImage(image, 0, 0, drawWidth, drawHeight);
        painted = available.index;
        useStore.getState().setAvatarReady(true);
        // Give the first useful paint priority, then prepare the full journey even
        // if the visitor is reading the hero instead of already scrolling.
        if (!warm && !media.matches && !warmTimer) {
          warmTimer = setTimeout(() => { warmTimer = undefined; warm = true; schedulePaint(); }, 250);
        }
      }
      const heroPresence = latest.activeSection === 'hero' ? 1 - latest.sectionProgress : 0;
      canvas.style.opacity = tier === 'mobile' ? String(0.08 + heroPresence * 0.14) : tier === 'tablet' ? '0.18' : '1';
      const stats = frames.stats;
      canvas.dataset.targetFrame = String(target);
      canvas.dataset.paintedFrame = String(painted);
      canvas.dataset.section = latest.activeSection;
      canvas.dataset.cacheFrames = String(stats.frames);
      canvas.dataset.decodedMb = (stats.decodedBytes / 1024 / 1024).toFixed(1);
      canvas.dataset.compressedFrames = String(stats.compressedFrames);
      canvas.dataset.anchors = `${stats.anchorFrames}/${stats.anchorTotal}`;
      canvas.dataset.inFlight = String(stats.inFlight);
      canvas.dataset.source = 'frames-lowres';
      canvas.dataset.decodeWidth = String(profile.decodeWidth);
      canvas.dataset.motion = media.matches ? 'reduced' : 'scroll';
    };
    const schedulePaint = () => { if (!raf && !disposed && !document.hidden) raf = requestAnimationFrame(paint); };
    const frames = new AvatarFrameCache({
      ...profile, baseUrl: import.meta.env.BASE_URL, sourceDirectory: 'frames-lowres',
      onReady: () => { if (painted !== target) schedulePaint(); },
    });
    frames.pause(document.hidden);
    const unsubscribe = subscribeScrollTimeline(value => {
      latest = value;
      cancelAnimationFrame(raf);
      paint();
    });
    const sizeObserver = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (rect) { width = rect.width; height = rect.height; }
      schedulePaint();
    });
    sizeObserver.observe(container);
    const visibility = () => {
      frames.pause(document.hidden);
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
      else schedulePaint();
    };
    const motionChange = () => {
      clearTimeout(warmTimer);
      warmTimer = undefined;
      target = -1;
      schedulePaint();
    };
    media.addEventListener('change', motionChange);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      disposed = true;
      unsubscribe();
      cancelAnimationFrame(raf);
      clearTimeout(warmTimer);
      sizeObserver.disconnect();
      media.removeEventListener('change', motionChange);
      document.removeEventListener('visibilitychange', visibility);
      frames.dispose();
    };
  }, []);

  return <div ref={containerRef} className="canvas-container" aria-hidden="true">
    <canvas ref={canvasRef} style={{ position: 'absolute', display: 'block', opacity: 0 }} />
  </div>;
}

export default Scene;
