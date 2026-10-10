# Avatar regression verification

The production application does not import this folder. Vite's production build has only the normal application entry, so these pages are local QA tools.

## Deterministic cache/network simulation

Run from the project root:

```powershell
node scripts/simulate-avatar-scroll.mjs --output=artifacts/qa/avatar-scroll-after.json
```

The script imports the real frame cache. Its controlled model uses 120 ms latency per request, the actual local WebP byte sizes at 1 MB/s per transfer, 8 ms per decode, and a 60 Hz target sampler. Transfers do not share a bandwidth bottleneck. No network requests or real image decodes occur. This makes request cancellation, decode retention, presentation error, and disposal regressions repeatable; it does **not** produce device FPS or hosted-network benchmarks.

`--module=absolute/path/to/avatarFrames.ts` tests another self-contained revision under identical conditions. Reports include the source SHA-256, configuration, cold forward sweep, warm reverse/forward sweeps, rapid reversals, and retained memory. A warm phase follows 30 seconds of simulated background work. Exact frames and the lighter retained anchor fallback are reported separately through exact and within-four-frame coverage.

## Real browser loader/render benchmark

Start the normal Vite development server, then open `/Portfolio/qa/avatar.html`. Choose a profile and click **Run 25-second benchmark**. Keep the tab foreground until completion. The visible report contains:

- Actual `createImageBitmap` decode durations, active decoding, and canvas draw durations.
- Animation-frame intervals over 33.4 and 50 ms.
- Displayed frame error, expression overshoot, and holds during movement.
- Network calls, duplicate URLs, aborts, retained cache bytes, and first pose timing.

The page temporarily adds the selected latency to avatar fetches inside that isolated page and restores browser functions when it finishes/stops. It never submits a form or changes the application. The canvas uses scheduled target trajectories rather than actual document scrolling, and the browser HTTP cache may already contain assets. This deliberately separates loader/render behavior from full-page layout, navigation, and browser compositing; those still need the portfolio's browser QA.

On a constrained profile, anchors may be eight source frames apart. Review both the displayed lag and actual visual motion; a four-frame threshold is stricter than that profile's fallback guarantee.
