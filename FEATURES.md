# Portfolio Stabilization Notes

## Implemented

- Scroll-driven canvas avatar with frame caching and nearby-frame preloading.
- Fixed Vite/Tailwind verification path for sandbox limitations.
- Responsive navigation with active-section highlighting, theme toggle, resume action, mobile overlay menu, and scroll progress bar.
- Project filtering by category with animated cards and implementation previews from project data.
- Skills marquee, capability cards, metrics, copy-to-clipboard email action, and accessible clipboard fallback.
- Branded page loader with a working exit animation.
- Custom cursor states for links, buttons, project cards, and text inputs.
- Reduced-motion support and better keyboard focus states.

## Verification

```text
npm.cmd run lint
npm.cmd run build
```

Both commands pass. The dev server is available at `http://127.0.0.1:5173` when started with:

```text
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

## Design Direction

The current pass keeps the site as a professional portfolio rather than a collection of effects. Interactions are tied to content: scroll drives the avatar, filters clarify the work, code previews expose implementation depth, and the cursor/menu/loader add polish without blocking the primary reading path.
