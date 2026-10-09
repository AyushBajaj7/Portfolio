import { useStore } from '../store/useStore';
import { buildSectionBoundaries, clamp, sampleSectionTimeline, SECTION_IDS } from './sectionTimeline';
import type { SectionBoundary, SectionId } from './sectionTimeline';

export type ScrollSnapshot = {
  scrollY: number; progress: number; activeSection: SectionId; sectionProgress: number;
  frame: number; width: number; height: number; revision: number;
};
type Listener = (snapshot: ScrollSnapshot) => void;
const listeners = new Set<Listener>();
let snapshot: ScrollSnapshot = { scrollY: 0, progress: 0, activeSection: 'hero', sectionProgress: 0, frame: 0, width: 0, height: 0, revision: 0 };
let stop: (() => void) | undefined;

/** One passive scroll listener and one on-demand rAF shared by navigation and canvas. */
function start() {
  let raf = 0;
  let geometryDirty = true;
  let disposed = false;
  let boundaries: SectionBoundary[] = [];
  let readingStarts: {id: SectionId; start: number}[] = [];
  let maxScroll = 0;
  let width = 0;
  let height = 0;
  let revision = 0;

  const update = () => {
    raf = 0;
    if (disposed || document.hidden) return;
    if (geometryDirty) {
      geometryDirty = false;
      width = window.innerWidth;
      height = window.innerHeight;
      maxScroll = Math.max(0, document.documentElement.scrollHeight - height);
      const sections = SECTION_IDS.flatMap(id => {
        const element = document.getElementById(id);
        if (!element) return [];
        const rect = element.getBoundingClientRect();
        return [{ id, top: rect.top + window.scrollY, height: rect.height }];
      });
      boundaries = buildSectionBoundaries(sections, height, maxScroll);
      readingStarts = sections.map((section, index) => ({ id: section.id, start: index === 0 ? 0 : clamp(section.top - height * 0.35, 0, maxScroll) }));
      revision++;
    }
    const scrollY = clamp(window.scrollY, 0, maxScroll);
    snapshot = { scrollY, progress: maxScroll > 0 ? scrollY / maxScroll : 0, width, height, revision, ...sampleSectionTimeline(boundaries, scrollY) };
    // The short-footer finale may start while Contact enters the viewport. Navigation
    // still follows the reading line (and selects Contact when the bottom is reached).
    for (const section of readingStarts) if (scrollY >= section.start) snapshot.activeSection = section.id;
    // Only section changes enter React. Pixel/frame tracking stays outside component state.
    useStore.getState().setActiveSection(snapshot.activeSection);
    for (const listener of listeners) listener(snapshot);
  };
  const schedule = () => {
    if (!raf && !document.hidden) raf = window.requestAnimationFrame(update);
  };
  const remeasure = () => { geometryDirty = true; schedule(); };
  const visibility = () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else remeasure();
  };
  const observer = new ResizeObserver(remeasure);
  observer.observe(document.documentElement);
  const root = document.getElementById('scroll-container');
  if (root) observer.observe(root);
  SECTION_IDS.forEach(id => { const element = document.getElementById(id); if (element) observer.observe(element); });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', remeasure, { passive: true });
  window.addEventListener('pageshow', remeasure);
  document.addEventListener('visibilitychange', visibility);
  document.fonts?.ready.then(() => { if (!disposed) remeasure(); });
  update();
  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    observer.disconnect();
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', remeasure);
    window.removeEventListener('pageshow', remeasure);
    document.removeEventListener('visibilitychange', visibility);
  };
}

export function subscribeScrollTimeline(listener: Listener) {
  listeners.add(listener);
  if (!stop) stop = start();
  else listener(snapshot);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) { stop?.(); stop = undefined; }
  };
}
