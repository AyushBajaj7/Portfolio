# Portfolio optimization review — 9 October 2026

Implemented locally. No commit, push, deployment, project-data replacement, or frame-asset deletion was performed.

## Confirmed root causes

- `Scene.tsx` maintained two estimated whole-page percentage timelines. Project filtering, changing layout, text wrapping, and resizing changed the geometry without updating those expression boundaries.
- Cinematic rail events changed global `scrollMode` and frame progress while window events changed them back. A vertical wheel also moved the horizontal rail. These competing inputs could disagree about the avatar playhead.
- Per-milestone Hermite easing plus a separate damped frame loop changed animation speed and introduced a trailing playhead. Broad Zustand subscriptions recalculated targets for unrelated state changes.
- Rendering mixed anchor/low-resolution WebPs with 1280px resting frames, then repainted after a 650ms timer. Canvas DPR was capped at 1/1.1. Resolution changes and resampling changed apparent sharpness.
- Multiple async image callbacks could repaint outside the main animation tick. Large anchor batches and image decodes competed with interaction work.
- Navigation depended on small scroll-direction changes and edge-pointer detection. Project cards used pointer-driven state or installed scroll listeners per card. Architecture rendering continued every frame while paused/offscreen and advanced rotation by a fixed increment per refresh.
- Dialogs and mobile navigation had incomplete focus containment, restoration, and scroll locking. Simulator timers could outlive a reset, scenario change, or unmount.

## Animation architecture

`sectionTimeline.ts` is a pure geometry-to-frame mapping. `scrollTimeline.ts` measures the actual Hero, Projects, About, Skills, and Contact elements; one passive window scroll listener coalesces updates into an on-demand requestAnimationFrame. ResizeObserver watches section/root dimensions, with additional measurement after resize, font readiness, and page restoration. Geometry is cached between layout changes. Navigation follows a 35% viewport reading line; short Contact sections receive enough visible runway to finish the wink before the page ends.

Verified zero-based choreography: Hero 0–88; Projects 88–175; About 175–212; Skills 212–254; Contact 254–299. The contact sheet confirms frame 35 opening/lifting, 68 greeting, 195–236 looking toward the left content lane, 268 forward smile, 284 wink, and 299 wink/smile. The existing sequence includes a rightward glance within Projects; its original expressions were preserved.

The canvas samples actual scroll position directly, without an eased second playhead. Reverse scrolling samples the same frames in reverse. Horizontal rail movement does not influence the avatar. Only active-section changes enter React state; frame changes are imperative canvas updates. Reduced motion uses a single greeting pose and no sequence prefetch. Live preference changes are observed natively.

`avatarFrames.ts` loads one source family: transparent high-resolution WebPs. Mobile/constrained devices decode uniformly to 960×540; desktop decodes to 1280×720. Crossing the mobile breakpoint rebuilds the cache for the appropriate resolution. There is no low-to-high resting swap. Requests prioritize the latest frame, prefetch a small bidirectional neighborhood, limit concurrency to 2/3, abort obsolete transport, reject stale decodes, and explicitly close evicted ImageBitmaps. Hidden pages pause work; resume and transient failures recover through bounded retries. Async completions only request a paint; they never paint an obsolete target directly.

Retained decoded RGBA budgets are 24 MiB constrained/mobile and 64 MiB desktop, excluding in-flight decoding, canvas/GPU buffers, and browser-managed encoded caches. Observed counters reached 13.8 MiB after mobile warmup and 63.3 MiB during desktop scrubbing. The avatar stage has a DPR cap of 2 and a 2.5-million-pixel backing-store cap; it no longer allocates a full-viewport canvas merely to draw a portrait on the right.

## UI and functionality

The dark palette, original copy, all 11 projects, original links, resume, and scroll-avatar concept remain. Hero typography and CTAs, desktop content lanes, readable descriptions, card alignment, wrapped controls, filter feedback, Skills cards, and Contact hierarchy were refined. Borders and focus visibility were strengthened without adding constant effects. Cinematic uses native horizontal scrolling, measured card offsets, explicit arrows, and keyboard controls; smaller screens retain the existing vertical project fallback.

Navigation stays visible and reports the measured active section. Mobile navigation, case studies, and terminal now contain focus, support Escape, restore focus, lock background scrolling, and isolate the background. The terminal retains history after first opening. Contact retains its provider path and offers an email-app draft fallback when no provider key is configured. The terminal LinkedIn action now uses the same portfolio data as Contact. No message was sent during QA.

## Important files changed

| File | Purpose |
| --- | --- |
| `src/components/canvas/Scene.tsx` | Single scroll playhead, consistent canvas quality, bounded stage, live motion/viewport handling |
| `src/lib/sectionTimeline.ts` | Pure measured section/frame choreography |
| `src/lib/scrollTimeline.ts` | Shared event-driven scroll coordinator and geometry invalidation |
| `src/lib/avatarFrames.ts` | Bounded async decode cache, priority, cancellation, disposal, retries |
| `src/lib/useMotionPreference.ts` | Live reduced-motion preference subscription |
| `src/store/useStore.ts` | Discrete UI state; removed unused scroll/cursor transport and production debug global |
| `src/components/ui/SectionGroup.tsx` | UI refinement, rail isolation, lazy demos/terminal, modal accessibility, contact fallback |
| `src/components/ui/Navbar.tsx` | Stable navigation, shared tracking, accessible mobile dialog |
| `src/components/ui/Cursor.tsx` | Event-driven fine-pointer feedback and reduced-motion handling |
| `src/components/ui/TiltCard.tsx` | Hover-only work, canceled stale transforms, preserved ARIA/data attributes |
| `src/components/ui/ArchitectureViewer3D.tsx` | Time-based orbit, idle/offscreen pause, DPR sizing, keyboard controls, accurate labels |
| `src/components/ui/BlastRadiusSimulator.tsx` | Cancel superseded/unmounted staged timers |
| `src/components/ui/TradersErpSimulator.tsx` | Cancel superseded/unmounted scenario timers |
| `src/components/ui/TerminalModal.tsx` | Portal/focus/scroll management, accessible controls, truthful clipboard feedback |
| `src/index.css` | Responsive content/avatar geometry, typography, contrast, native rail behavior, fewer permanent GPU layers |
| `src/App.tsx` | Keyboard skip link |
| `index.html` | Removed unused Material Symbols font request |
| `vite.config.ts` | Avoid watching generated QA and all avatar directories |
| `scripts/build-frame-anchors.mjs` | Prevent the old 480px anchor-generation downgrade |
| `scripts/audit-avatar-assets.mjs` | Reproducible asset inventory and expression contact sheet |
| `package.json` and `tests/*.test.mjs` | Dependency-free regression test command and 13 tests |

## Measurements and checks

| Check | Result |
| --- | --- |
| Baseline build/lint | Passed before changes |
| Final `npm.cmd run build` | Passed TypeScript + Vite + asset copying |
| Final `npm.cmd run lint` | Passed |
| `npm.cmd test` | 13 passed, 0 failed |
| `git diff --check` | Passed; Git prints normal LF/CRLF conversion notices |
| Entry JavaScript | Approximately 497.04 → 305.63 kB |
| Initial JS including shared HTML modulepreloads | Approximately 497.04 → 436.27 kB, about 12% smaller |
| Initial JS gzip, Vite-reported totals | Approximately 146.82 → 134.93 kB |
| CSS | Approximately 80.82 → 80.92 kB |
| Responsive browser checks | 360, 390, 768, 1024, 1440, 1920px: no horizontal page overflow |
| Fast forward/backward and direction changes | Observed settled target/painted pairs 299/299, 125/125, 172/172 |
| Cinematic rail isolation | Rail moved 0→388px while scrollY and frame 101 stayed unchanged |
| Filter/layout changes | Counts and measured timeline recalculated correctly |
| Production preview | Loaded compiled assets and avatar successfully |
| Preserved interactions | Architecture pause/shading/keyboard, ERP scenarios, blast-radius run/reset, Cat-X hazard action, case-study dialogs, terminal commands/Escape, mobile navigation |

The regression tests exercise timeline continuity, endpoints, reversed/history-independent sampling, resized/filtered geometry, short final sections, request concurrency and priority, aborted transports, stale decodes, bitmap release, reduced-motion loading, hiding/resuming, failure recovery, and disposal. They exposed two pause/retry defects during development that were fixed and re-tested.

Asset audit: 300 transparent 1280×720 WebPs (15,304,808 bytes), 300 transparent 960×540 WebPs (8,571,420 bytes), 76 transparent 960×540 anchors (2,336,602 bytes), and 26 retained original PNGs. The current anchors were already 960px; 480px appeared in the old generator, not the current inventory. No original frame files were regenerated or removed. `public/resume.pdf` remains present (148,671 bytes). `src/data/portfolio.json` is unchanged.

Evidence lives in `artifacts/qa/`: asset JSON/contact sheet, bundle audit, responsive geometry JSON, and screenshots at all six widths. `verified-hero-*.jpg` are viewport crops of browser full-page captures, used because the browser's viewport-only capture occasionally scaled incorrectly during emulation.

## Limits

No reliable before/after FPS, long-task trace, or process-memory profiler was available through the browser connector. Bundle sizes and application cache counters are measured; the memory budgets are retained-image estimates, not total browser RSS. A 60 FPS result is not claimed. Fast scrolling can intentionally skip expressions when the content itself jumps, and a cold uncached pose can briefly retain the nearest same-quality frame until decoding finishes. The original 1280×720 source places a ceiling on facial detail on very large/Retina displays. External demo/GitHub/Drive destinations were preserved, but their remote service health was not exhaustively tested. Reduced-motion cache behavior is regression-tested; OS-level motion emulation was unavailable in the browser connector. Email delivery still requires either the configured provider or the visitor's email application.


## Follow-up fixes — 2026-10-09

- Cursor.tsx: removed positional springs and updates pointer motion values directly from pointer events. Shape changes remain animated; card VIEW feedback now distinguishes cards from nested links.
- avatarFrames.ts / Scene.tsx: selection is bounded between the displayed frame and the requested playhead. Sparse prefetched high-resolution poses cannot overshoot then replay when exact decoding finishes. Initial presentation waits for its exact pose.
- sectionTimeline.ts: Contact choreography finishes over its viewport entrance instead of stretching to the document bottom. Expanding contact feedback does not rewind the finale. Short sections still reserve available space.
- SectionGroup.tsx: resume cue is suppressed on deep links/restored scroll and cancelled permanently by scroll, pointer input, keyboard, resize, or visibility changes. Its delayed timer cannot resurrect a dismissed cue; exit is immediate.
- Contact: the local mail key is configured and has UUID format (value not recorded). Rebuilt UI exposes direct submission. Added a 15-second timeout, duplicate-submit guard, unmount cancellation, draft-preserving errors, accurate service-acceptance wording, and clipboard rejection fallback. No test email was sent, so provider acceptance and inbox delivery remain unverified. Published configuration is not changed by local fixes.
- index.css: themed browser autofill uses the existing surface and text variables.
- Frame source remains exclusively public/frames/maleNNNN.webp (1280x720), decoded to 960x540 on constrained/mobile devices. No lowres/anchor directory requests or stop-time quality replacement.
- Verification: 15 Node tests cover loading, cancellation, memory limits, directional presentation, geometry, layout reflow and contact expansion. Build and lint pass. Browser exercised contact draft copy, deep-link cue suppression, reverse section navigation, Cinematic mode and 3D filter; measured no document overflow at requested widths 360/390/768/1024/1440/1920. No browser console errors observed. Browser checking is not an FPS benchmark.
- No commits, pushes, deployments, original frame deletions, or content replacements.


## Recruiter-focused revision - 2026-10-09

This revision supersedes the high-resolution-only policy above. The owner confirmed mail is working. No secrets, GitHub settings or deployment workflow changed.

- SectionGroup.tsx: first screen now leads with name, specialization, education, internship and direct case-study links for MDT, Cat-X and Traders ERP. Skills link to project evidence. Drive resume copy remains under Contact. Private source links are suppressed in Cinematic cards.
- ProjectEvidence.tsx (new): concrete engineering decisions shared across selected project cards and case studies. No invented impact metrics or team-ownership claims.
- portfolio.json: education (VIT Vellore, B.Tech Computer Science, 2023-2027, CGPA 8.76) and KuppiSmart internship (May-Jul 2025) transcribed from public/resume.pdf. Estimated performance/transaction metrics were not promoted. All 11 projects retained.
- index.css: editorial hierarchy, compact project links, readable evidence panels and mobile stacking. Initial hero text is immediately visible rather than waiting for reveal animation.
- The current JSON mail handler referenced an undefined formattedSubject. Restored subject construction while preserving the owner's request format, endpoint and key.
- Scene.tsx / avatarFrames.ts: one initial pose before scrolling; a bounded neighborhood thereafter. Removed timed distant-anchor warmup. Demos now launch explicitly; filtering no longer auto-launches another engine.
- Capable desktop uses public/frames (1280x720). Mobile/constrained/save-data devices consistently use public/frames-lowres (960x540). No idle quality replacement. Crossing the mobile breakpoint rebuilds the cache for the new tier.
- Browser idle measurements: desktop 1 cached frame / 3.5 MiB decoded / 0 pending; mobile 1 frame / 2.0 MiB / 0 pending. First-frame file sizes: 49.4 KiB desktop, 28.1 KiB mobile. These are payload/cache values, not hosted latency or FPS benchmarks.
- Validation: 16 tests, build, lint and whitespace checks pass. Browser checks found no horizontal overflow at 360/390/768/1024/1440/1920. Verified mobile menu, selected case study, skill-to-project link, MDT demo execution, Cinematic Full Stack filtering and developer terminal.
- Preserved frame assets: 300 main, 300 low-resolution and 76 anchors. No commit, push or deployment.

Limitations: hosted cold-network performance is not measured for this local revision. Actual delivery performance requires deployment and real device testing. Resume project details differ from current portfolio descriptions in places, notably the disease-classifier dataset; this pass uses only resume education/internship facts and does not rewrite the PDF. Reconcile those project descriptions before applications.
