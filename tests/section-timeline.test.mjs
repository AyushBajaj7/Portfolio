import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSectionBoundaries, sampleSectionTimeline } from '../src/lib/sectionTimeline.ts';

const geometry = [
  { id: 'hero', top: 0, height: 900 },
  { id: 'projects', top: 900, height: 2400 },
  { id: 'about', top: 3300, height: 700 },
  { id: 'skills', top: 4000, height: 800 },
  { id: 'contact', top: 4800, height: 900 },
];

test('real section positions and available Contact space reach verified expression endpoints', () => {
  const boundaries = buildSectionBoundaries(geometry, 900, 4800);
  assert.deepEqual(sampleSectionTimeline(boundaries, 0), { activeSection: 'hero', sectionProgress: 0, frame: 0 });
  // Reading-line crossings lead the story; Contact reserves enough visible
  // space before the footer to finish its smile/wink without a last-pixel jump.
  for (const [scrollY, section, frame] of [
    [585, 'projects', 88], [2985, 'about', 175],
    [3685, 'skills', 212], [4215, 'contact', 254],
  ]) {
    const current = sampleSectionTimeline(boundaries, scrollY);
    assert.equal(current.activeSection, section);
    assert.equal(current.frame, frame);
    assert.equal(current.sectionProgress, 0);
    assert.ok(Math.abs(current.frame - sampleSectionTimeline(boundaries, scrollY - 0.001).frame) < 0.01,
      `No frame jump as ${section} enters the reading line`);
  }
  assert.deepEqual(sampleSectionTimeline(boundaries, 4800), { activeSection: 'contact', sectionProgress: 1, frame: 299 });
  assert.equal(sampleSectionTimeline(boundaries, -100).frame, 0);
  assert.equal(sampleSectionTimeline(boundaries, 10000).frame, 299);
});

test('a short Contact section has visible scroll space for its finale before the footer', () => {
  const shortContact = geometry.map(section => section.id === 'contact' ? { ...section, height: 250 } : { ...section });
  const maxScroll = 4150;
  const boundaries = buildSectionBoundaries(shortContact, 900, maxScroll);
  const finale = boundaries.find(boundary => boundary.id === 'contact');
  assert.ok(finale.start >= 3900, 'Contact must be entering the viewport before its choreography begins');
  assert.ok(finale.start < maxScroll - 100, 'The wink must have meaningful scroll space rather than one footer pixel');
  assert.equal(sampleSectionTimeline(boundaries, finale.start).frame, 254);
  const middle = sampleSectionTimeline(boundaries, (finale.start + maxScroll) / 2);
  assert.equal(middle.activeSection, 'contact');
  assert.ok(middle.frame > 254 && middle.frame < 299);
  assert.equal(sampleSectionTimeline(boundaries, maxScroll).frame, 299);
});

test('forward, backward, and rapid reversal samples are monotonic and history-independent', () => {
  const boundaries = buildSectionBoundaries(geometry, 900, 4800);
  const positions = Array.from({ length: 601 }, (_, index) => index * 8);
  const forward = positions.map(y => sampleSectionTimeline(boundaries, y));
  const backward = [...positions].reverse().map(y => sampleSectionTimeline(boundaries, y)).reverse();
  assert.deepEqual(backward, forward);
  for (let index = 1; index < forward.length; index++) {
    assert.ok(forward[index].frame >= forward[index - 1].frame);
  }
  for (const index of [400, 5, 599, 5, 300, 0, 600, 400]) {
    assert.deepEqual(sampleSectionTimeline(boundaries, positions[index]), forward[index]);
  }
});

test('layout switches, filtering, and viewport reflow synchronize to the new DOM positions', () => {
  const bento = buildSectionBoundaries(geometry, 900, 4800);
  const cinematicGeometry = geometry.map(section => section.id === 'projects'
    ? { ...section, height: 1000 }
    : section.top >= 3300 ? { ...section, top: section.top - 1400 } : { ...section });
  const cinematic = buildSectionBoundaries(cinematicGeometry, 900, 3400);
  assert.equal(sampleSectionTimeline(bento, 1585).activeSection, 'projects');
  assert.deepEqual(sampleSectionTimeline(cinematic, 1585), { activeSection: 'about', sectionProgress: 0, frame: 175 });
  assert.equal(sampleSectionTimeline(bento, 2985).frame, 175);

  // Filtering shortens projects again; the avatar still meets About at its actual top.
  const filteredGeometry = cinematicGeometry.map(section => section.id === 'projects'
    ? { ...section, height: 450 }
    : section.top >= 1900 ? { ...section, top: section.top - 550 } : { ...section });
  const filtered = buildSectionBoundaries(filteredGeometry, 900, 2850);
  assert.equal(sampleSectionTimeline(filtered, 1035).activeSection, 'about');
  assert.equal(sampleSectionTimeline(filtered, 1035).frame, 175);

  const tablet = buildSectionBoundaries(geometry, 768, 4932);
  const aboutAtReadingLine = 3300 - 768 * 0.35;
  assert.equal(sampleSectionTimeline(tablet, aboutAtReadingLine - 1).activeSection, 'projects');
  assert.equal(sampleSectionTimeline(tablet, aboutAtReadingLine).activeSection, 'about');
  assert.equal(sampleSectionTimeline(tablet, aboutAtReadingLine).frame, 175);
});

test('short sections, zero scroll range, and missing geometry remain finite and bounded', () => {
  const short = [
    { id: 'hero', top: 0, height: 500 },
    { id: 'projects', top: 500, height: 10 },
    { id: 'about', top: 510, height: 2 },
    { id: 'skills', top: 512, height: 1000 },
    { id: 'contact', top: 1512, height: 488 },
  ];
  const boundaries = buildSectionBoundaries(short, 600, 1400);
  let previous = -Infinity;
  for (let y = 0; y <= 1400; y += 0.5) {
    const sample = sampleSectionTimeline(boundaries, y);
    assert.ok(Number.isFinite(sample.frame));
    assert.ok(sample.frame >= previous && sample.frame >= 0 && sample.frame <= 299);
    previous = sample.frame;
  }
  assert.equal(sampleSectionTimeline(boundaries, 302).activeSection, 'skills');
  assert.equal(sampleSectionTimeline(boundaries, 302).frame, 212);
  const zero = sampleSectionTimeline(buildSectionBoundaries(short, 2000, 0), 0);
  assert.ok(Number.isFinite(zero.frame) && zero.frame >= 0 && zero.frame <= 299);
  assert.ok(Number.isFinite(zero.sectionProgress));
  assert.deepEqual(sampleSectionTimeline([], 500), { activeSection: 'hero', sectionProgress: 0, frame: 0 });
});


test('expanding Contact form feedback does not rewind the finale', () => {
  const original = buildSectionBoundaries(geometry, 900, 4800);
  const expanded = buildSectionBoundaries(geometry.map(section => section.id === 'contact'
    ? { ...section, height: section.height + 300 } : section), 900, 5100);
  for (const y of [4215, 4400, 4650, 4800]) {
    assert.equal(sampleSectionTimeline(original, y).frame, sampleSectionTimeline(expanded, y).frame);
  }
  assert.equal(sampleSectionTimeline(expanded, 5100).frame, 299);
});
