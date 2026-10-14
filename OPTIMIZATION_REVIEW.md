# Portfolio optimization review - 14 October 2026

This is the current implementation report. It supersedes the earlier high-resolution-only and one-pose-cache recommendations, which caused a loading regression. Changes are local and uncommitted; no push or deployment was performed. Mail delivery configuration was left unchanged because the owner confirmed it works.

## Confirmed causes and fixes

- The regressed loader cancelled transfers as the playhead moved, discarded useful late decodes, and retained too few neighboring frames. Slow transfers could repeatedly miss the moving target. The restored pipeline keeps useful transfers, caches compressed frames, and retains a decoded anchor backbone across the entire sequence.
- Cold requests still chased positions already passed. Fetch priority now uses recent scroll velocity and measured fetch latency to prepare likely arrival positions, while reserving work for the exact target and global coverage. Prediction never changes the displayed playhead.
- Full-stage bitmaps retained large transparent margins. An alpha audit of all 300 low-resolution frames found every visible pixel within x=218..742, y=36..528. A padded 540x510 crop at (210,28) preserves all pixels and the virtual 960x540 placement. Anchor bounds were also checked. No source assets were modified.
- Mobile browser toolbar/keyboard height changes could shift expression boundaries during a gesture. Touch layouts retain a stable timeline height until width/orientation changes; physical scroll limits still update.
- Earlier percentage timelines, competing horizontal/vertical scroll inputs, and an independently eased playhead were replaced by real section geometry and one shared, on-demand scroll timeline. These fixes remain in place.
- Future-anchor overshoot followed by exact-frame replacement could replay an expression. Presentation only moves between the displayed frame and the current target. Late decodes populate the cache; they cannot directly paint.

## Current animation architecture

Production uses the existing 960x540 `frames-lowres` and same-resolution `frames-anchors` assets. It is NOT high-resolution-only. There is no blurry-to-sharp idle replacement. The original 1280x720 frames remain untouched.

The first pose is prioritized. After its first paint, a 250ms delay begins staged coverage and compressed prefetch. Retained compressed data is capped at 12 MiB; the sequence used in the simulation transfers about 8.3 MiB. Saving data skips full-sequence background prefetch. Reduced motion requests one greeting pose only.

Desktop keeps 76 decoded anchors and nearby detail within 112 MiB. Touch, narrow, low-memory, and data-saving profiles use a proportional 360x340 cropped bitmap and a 48 MiB budget. Desktop uses 540x510. Cropping reduces bytes per decoded frame by 46.9% without removing visible source pixels. Budgets exclude in-flight decodes, canvas buffers and browser/GPU bookkeeping.

Network concurrency is 4 desktop / 3 constrained; decoding concurrency is 2 / 1. Evicted ImageBitmaps are closed. Hidden pages pause work, temporary failures retry within bounds, and unmount disposes resources. Resizing does not discard the prepared cache or change source quality mid-session.

Canvas backing stores are limited to 1.4 million pixels desktop / 0.7 million constrained with a DPR ceiling of 2. The canvas covers the portrait crop rather than the transparent stage. Scrolling uses cached geometry; ResizeObserver handles size changes.

Hero, Projects, About, Skills and Contact share a geometry-derived timeline, with zero-based boundaries 0/88/175/212/254/299. Contact finishes over its entrance so form expansion cannot replay its finale. Horizontal project browsing does not alter the avatar. React receives active-section changes, not every frame.

## Interface and functionality

- Retained the dark identity, scroll avatar, all 11 projects, both project layouts, case studies, interactive simulations, terminal, resume links and contact actions.
- Removed Traders ERP's external live deployment link. Its project content, case study and local illustrative simulator remain. Private-source messaging no longer promises a live deployment.
- Retained the recruiter-facing hierarchy: name, backend/applied-AI focus, education, internship and direct MDT/Cat-X/Traders ERP evidence links. No new credentials, impact metrics or ownership claims were invented.
- Fixed Cinematic counter calculations to account for its overview card. Profile links are labelled GitHub profile rather than repository source.
- Opaque project panels prevent the avatar showing through project text.
- Coarse-pointer devices use touch navigation, comfortable controls, a vertical Cinematic fallback and the lighter avatar profile even with a wide Desktop-site viewport. Contact inputs use 16px text on narrow screens and touch devices.
- Optional lazy demos and terminal have a feature error boundary so a failed chunk cannot blank the portfolio. Reload recovery is explicit; the rest of the page remains usable.
- Existing cursor positional springs remain removed; only shape changes animate. The resume arrow remains a one-time cue cancelled by scroll, interaction, resize, visibility change or reduced-motion preference, and suppressed on deep links/restored scroll.

## Important files changed in this follow-up

| File | Purpose |
| --- | --- |
| `src/lib/avatarProfile.ts` | Shared device policy and audited alpha crop |
| `src/lib/avatarFrames.ts` | Cropped decode, retained cache, arrival-position fetch priority |
| `src/components/canvas/Scene.tsx` | Smaller canvas, proportional placement, stable profile |
| `src/lib/sectionTimeline.ts` | Stable touch viewport geometry helper |
| `src/lib/scrollTimeline.ts` | Apply touch geometry without overriding native scroll |
| `src/components/ui/Navbar.tsx` | Touch navigation including Desktop-site mode |
| `src/components/ui/SectionGroup.tsx` | Project counter, source labels, private case-study copy, lazy feature boundaries |
| `src/components/ui/FeatureBoundary.tsx` | Contain optional feature failures |
| `src/data/portfolio.json` | Remove Traders ERP external demo URL |
| `src/index.css` | Touch layout, canvas sizing, form readability and opaque panels |
| `tests/avatar-scroll-regression.test.mjs` | Delayed scroll, memory, reverse/jump and device-profile regression coverage |
| `tests/section-timeline.test.mjs` | Toolbar/keyboard/orientation boundary tests |
| `tests/helpers/avatar-network.mjs` | Crop-aware deterministic bitmap model |
| `scripts/simulate-avatar-scroll.mjs` | Reproducible real-cache simulation with actual asset byte sizes |
| `qa/avatar-benchmark.ts`, `qa/avatar.html` | Browser renderer harness matching current profile; timing validity flag |

## Measurements and verification

`npm.cmd test`: 24/24 passing. `npm.cmd run build`: passing. `npm.cmd run lint`: passing. Build emits a non-blocking Node module.register deprecation warning. Main JS is 312.90 kB / 94.09 kB gzip; CSS 84.11 kB / 14.48 kB gzip. Interactive engines and terminal remain separate lazy chunks.

The same deterministic network model before/after arrival prefetch uses actual asset sizes, 120ms RTT per request, 1 MB/s per transfer, 8ms decode and 60Hz target samples. It does not model a shared bandwidth limit and is NOT browser FPS or hosted performance.

| Cold five-second sweep | Before arrival prefetch | After |
| --- | ---: | ---: |
| Desktop samples within four frames | 38.9% | 79.7% |
| Desktop longest held frame while moving | 283ms | 133ms |
| Constrained samples within four frames | 27.9% | 71.8% |
| Constrained longest held frame while moving | 317ms | 133ms |

Warm reverse/forward sweeps matched all targets in this model, made no repeat downloads and produced no presentation overshoots. Disposal released every simulated bitmap. Tests also cover reversal, transient errors, visibility pause, reduced motion, compressed-budget limits, idle decoding, section reflow and contact expansion.

Local browser checks: zero horizontal document overflow and no clipped headings at actual CSS widths 360, 390, 768, 980, 1024, 1440 and 1920. Verified Bento/Cinematic switching, Full Stack filtering, rail controls, Traders ERP case-study opening/closing, removal of its deployment URL, mobile menu, contact navigation, and terminal opening/keyboard dismissal. The frame cache survived resizing. A fresh desktop visit selected the 960px profile and prepared all 76 anchors and 300 compressed frames; section navigation matched target and painted frame counters. Narrow contact inputs were verified at 16px. No browser console errors were observed during the final interaction check. No test email was sent.

Machine-readable measurements are under `artifacts/qa/avatar-scroll-arrival-prefetch.json`, with the prefetch baseline in `avatar-scroll-cropped.json`. Real image decoding/canvas loading also ran through the browser harness; its timing is explicitly flagged invalid because the controlled browser throttled requestAnimationFrame while occluded. Do not quote that run as a 60 FPS result.

## Remaining verification limits

- Hosted GitHub Pages performance has not been measured for these unpublished changes. No deployment was performed.
- Physical iOS/Android touch and Desktop-site behavior still require device verification; viewport checks and pure device-profile tests are not a substitute.
- An immediate full-page fling on an empty slow connection can still skip unavailable frames. Sparse same-quality anchors provide bounded fallback once prepared; the browser cannot display assets that have not arrived.
- No claim of guaranteed 60 FPS or a guaranteed recruiting outcome is made. The changes address measured loading/caching defects and improve clarity without replacing the portfolio's identity.
