/** Pure geometry-to-frame mapping; no easing, elapsed-time drift, or layout-specific percentages. */
export const SECTION_IDS = ['hero', 'projects', 'about', 'skills', 'contact'] as const;
export type SectionId = (typeof SECTION_IDS)[number];
export type SectionGeometry = { id: SectionId; top: number; height: number };
export type SectionBoundary = { id: SectionId; start: number; end: number; from: number; to: number };

// Zero-based frames verified against the original sequence contact sheet.
// 0 bowed/eyes shut; 35 opening; 68 greeting; 175 turning left; 212 focused;
// 254 returning to visitor; 268 smile; 284 wink; 299 finale.
export const EXPRESSION_FRAMES = [0, 88, 175, 212, 254, 299] as const;
export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function buildSectionBoundaries(sections: SectionGeometry[], viewportHeight: number, maxScroll: number): SectionBoundary[] {
  const readingLine = viewportHeight * 0.35;
  const starts = sections.map((section, index) => index === 0 ? 0 : clamp(section.top - readingLine, 0, maxScroll));
  // Short Contact sections cannot reach the usual reading line before the page ends.
  // Give the finale room while Contact enters the viewport, using its actual height.
  const contactIndex = sections.findIndex(section => section.id === 'contact');
  if (contactIndex >= 0) {
    const finaleSpan = Math.min(sections[contactIndex].height * 0.65, viewportHeight * 0.65);
    starts[contactIndex] = Math.max(starts[contactIndex - 1] ?? 0, Math.min(sections[contactIndex].top - viewportHeight * 0.65, Math.max(0, maxScroll - finaleSpan)));
  }
  return sections.map((section, index) => ({
    id: section.id,
    start: starts[index],
    // Finish during Contact's entrance, independent of expanding form feedback.
    // A longer draft/chooser must not rewind and replay the wink.
    end: starts[index + 1] ?? (section.id === 'contact' ? Math.min(maxScroll, starts[index] + viewportHeight * 0.65) : maxScroll),
    from: EXPRESSION_FRAMES[SECTION_IDS.indexOf(section.id)],
    to: EXPRESSION_FRAMES[SECTION_IDS.indexOf(section.id) + 1],
  }));
}

export function sampleSectionTimeline(boundaries: SectionBoundary[], scrollY: number) {
  let boundary = boundaries[0];
  for (const candidate of boundaries) {
    if (scrollY >= candidate.start) boundary = candidate;
  }
  if (!boundary) return { activeSection: 'hero' as SectionId, sectionProgress: 0, frame: 0 };
  const span = boundary.end - boundary.start;
  const sectionProgress = span > 0 ? clamp((scrollY - boundary.start) / span) : 1;
  return {
    activeSection: boundary.id,
    sectionProgress,
    frame: boundary.from + (boundary.to - boundary.from) * sectionProgress,
  };
}
