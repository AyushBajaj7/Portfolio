import React, { useRef, useEffect, useState, useCallback, useSyncExternalStore } from 'react';
import {
  Rotate3d,
  Compass,
  Play,
  Pause,
  Grid3X3,
  Sun,
  Palette,
  ArrowRight,
} from 'lucide-react';

type RenderMode = 'shaded' | 'blueprint' | 'clay';
type CameraAngle = 'iso' | 'front' | 'top';

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';
const subscribeReducedMotion = (notify: () => void) => {
  const media = window.matchMedia(reducedMotionQuery);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};
const getReducedMotion = () => window.matchMedia(reducedMotionQuery).matches;

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface PolygonFace {
  indices: number[];
  color: string;
  wireColor?: string;
  isGlass?: boolean;
}

// Architectural modern villa / pavilion 3D mesh definition
const VERTICES: Point3D[] = [
  // Base slab (0-3)
  { x: -2.8, y: -0.2, z: -2.2 },
  { x: 2.8, y: -0.2, z: -2.2 },
  { x: 2.8, y: -0.2, z: 2.2 },
  { x: -2.8, y: -0.2, z: 2.2 },

  // Ground floor slab top (4-7)
  { x: -2.8, y: 0.1, z: -2.2 },
  { x: 2.8, y: 0.1, z: -2.2 },
  { x: 2.8, y: 0.1, z: 2.2 },
  { x: -2.8, y: 0.1, z: 2.2 },

  // Main pavilion floor (8-11)
  { x: -2.0, y: 0.1, z: -1.6 },
  { x: 1.6, y: 0.1, z: -1.6 },
  { x: 1.6, y: 0.1, z: 1.4 },
  { x: -2.0, y: 0.1, z: 1.4 },

  // Main pavilion ceiling / lower roof (12-15)
  { x: -2.0, y: 1.6, z: -1.6 },
  { x: 1.6, y: 1.6, z: -1.6 },
  { x: 1.6, y: 1.6, z: 1.4 },
  { x: -2.0, y: 1.6, z: 1.4 },

  // Upper cantilever roof (16-19)
  { x: -2.4, y: 2.4, z: -1.9 },
  { x: 2.2, y: 2.4, z: -1.9 },
  { x: 2.2, y: 2.4, z: 1.8 },
  { x: -2.4, y: 2.4, z: 1.8 },

  // Upper roof top slab (20-23)
  { x: -2.4, y: 2.55, z: -1.9 },
  { x: 2.2, y: 2.55, z: -1.9 },
  { x: 2.2, y: 2.55, z: 1.8 },
  { x: -2.4, y: 2.55, z: 1.8 },

  // Upper floor bedroom block (24-27)
  { x: -1.6, y: 1.6, z: -1.2 },
  { x: 1.0, y: 1.6, z: -1.2 },
  { x: 1.0, y: 1.6, z: 1.0 },
  { x: -1.6, y: 1.6, z: 1.0 },

  // Upper floor ceiling (28-31)
  { x: -1.6, y: 2.4, z: -1.2 },
  { x: 1.0, y: 2.4, z: -1.2 },
  { x: 1.0, y: 2.4, z: 1.0 },
  { x: -1.6, y: 2.4, z: 1.0 },

  // Pillars / Columns (32-35)
  { x: 1.9, y: 0.1, z: 1.6 },
  { x: 1.9, y: 2.4, z: 1.6 },
  { x: -2.2, y: 0.1, z: 1.6 },
  { x: -2.2, y: 2.4, z: 1.6 },

  // Pool water sheet (36-39)
  { x: 1.2, y: 0.05, z: -2.0 },
  { x: 2.5, y: 0.05, z: -2.0 },
  { x: 2.5, y: 0.05, z: -0.6 },
  { x: 1.2, y: 0.05, z: -0.6 },
];

const FACES: PolygonFace[] = [
  // Base slab top
  { indices: [4, 5, 6, 7], color: '#383b40', wireColor: '#60a5fa' },
  // Base slab front
  { indices: [7, 6, 2, 3], color: '#25272a', wireColor: '#60a5fa' },
  // Base slab right
  { indices: [6, 5, 1, 2], color: '#2b2e33', wireColor: '#60a5fa' },

  // Pool water sheet
  { indices: [36, 37, 38, 39], color: '#0ea5e9', wireColor: '#38bdf8', isGlass: true },

  // Main ground glass facade front
  { indices: [11, 10, 14, 15], color: '#14b8a6', wireColor: '#2dd4bf', isGlass: true },
  // Main ground glass facade right
  { indices: [10, 9, 13, 14], color: '#0d9488', wireColor: '#2dd4bf', isGlass: true },
  // Main ground solid back wall
  { indices: [8, 11, 15, 12], color: '#4b5563', wireColor: '#9ca3af' },

  // Ground floor ceiling / divider slab
  { indices: [12, 13, 14, 15], color: '#52525b', wireColor: '#a1a1aa' },

  // Upper block walls (timber & concrete)
  { indices: [27, 26, 30, 31], color: '#78716c', wireColor: '#d6d3d1' },
  { indices: [26, 25, 29, 30], color: '#64748b', wireColor: '#cbd5e1' },
  { indices: [24, 25, 29, 28], color: '#57534e', wireColor: '#a8a29e' },
  { indices: [27, 24, 28, 31], color: '#44403c', wireColor: '#78716c' },

  // Cantilever roof bottom
  { indices: [16, 17, 18, 19], color: '#334155', wireColor: '#94a3b8' },
  // Cantilever roof front edge
  { indices: [19, 18, 22, 23], color: '#1e293b', wireColor: '#64748b' },
  // Cantilever roof top slab
  { indices: [20, 21, 22, 23], color: '#475569', wireColor: '#cbd5e1' },
];

interface Point2D {
  x: number;
  y: number;
}

function transformPoint(
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  cx: number,
  cy: number,
  scale: number,
  fov: number
): Point2D {
  const x1 = x * Math.cos(ry) + z * Math.sin(ry);
  const z1 = -x * Math.sin(ry) + z * Math.cos(ry);
  const y2 = y * Math.cos(rx) - z1 * Math.sin(rx);
  const z2 = y * Math.sin(rx) + z1 * Math.cos(rx);
  const camZ = z2 + 6.2;
  const proj = fov / (camZ > 1 ? camZ : 1);
  return {
    x: cx + x1 * scale * (proj / fov),
    y: cy - y2 * scale * (proj / fov),
  };
}

export const ArchitectureViewer3D: React.FC<{
  onExploreMore?: () => void;
}> = ({ onExploreMore }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderMode, setRenderMode] = useState<RenderMode>('shaded');
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>('iso');
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => true);
  const isAutoRotating = isAutoRotate && !reducedMotion;

  // Rotation angles in radians
  const rotX = useRef<number>(0.42);
  const rotY = useRef<number>(0.85);
  const isDragging = useRef<boolean>(false);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animFrameId = useRef<number | null>(null);
  const dimensionsRef = useRef({ width: 640, height: 320 });
  const requestDrawRef = useRef<() => void>(() => {});

  // Set camera angle preset
  const setCameraPreset = (angle: CameraAngle) => {
    setCameraAngle(angle);
    setIsAutoRotate(false);
    if (angle === 'iso') {
      rotX.current = 0.45;
      rotY.current = 0.78;
    } else if (angle === 'front') {
      rotX.current = 0.12;
      rotY.current = 0.05;
    } else if (angle === 'top') {
      rotX.current = 1.35;
      rotY.current = 0.0;
    }
    requestDrawRef.current();
  };

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensionsRef.current;
    ctx.clearRect(0, 0, width, height);

    const rx = rotX.current;
    const ry = rotY.current;

    // Center & Scale
    const cx = width / 2;
    const cy = height / 2 + 10;
    const scale = Math.min(width, height) / 3.6;
    const fov = 420;

    // Transform 3D vertices
    const transformed = VERTICES.map((v) => {
      // Rotate Y (yaw)
      const x1 = v.x * Math.cos(ry) + v.z * Math.sin(ry);
      const z1 = -v.x * Math.sin(ry) + v.z * Math.cos(ry);
      // Rotate X (pitch)
      const y2 = v.y * Math.cos(rx) - z1 * Math.sin(rx);
      const z2 = v.y * Math.sin(rx) + z1 * Math.cos(rx);

      // Camera distance offset
      const camZ = z2 + 6.2;
      const proj = fov / (camZ > 1 ? camZ : 1);

      return {
        x2d: cx + x1 * scale * (proj / fov),
        y2d: cy - y2 * scale * (proj / fov),
        depth: camZ,
        worldX: x1,
        worldY: y2,
        worldZ: z2,
      };
    });

    // Draw Blueprint Ground Grid in blueprint mode
    if (renderMode === 'blueprint') {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 1;
      const gridSize = 7;
      for (let i = -gridSize; i <= gridSize; i++) {
        // Grid line parallel to X
        const p1 = transformPoint(-gridSize * 0.5, -0.2, i * 0.5, rx, ry, cx, cy, scale, fov);
        const p2 = transformPoint(gridSize * 0.5, -0.2, i * 0.5, rx, ry, cx, cy, scale, fov);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Grid line parallel to Z
        const p3 = transformPoint(i * 0.5, -0.2, -gridSize * 0.5, rx, ry, cx, cy, scale, fov);
        const p4 = transformPoint(i * 0.5, -0.2, gridSize * 0.5, rx, ry, cx, cy, scale, fov);
        ctx.beginPath();
        ctx.moveTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.stroke();
      }
    }

    // Sort faces by average depth (Painter's algorithm)
    const sortedFaces = FACES.map((face) => {
      let avgDepth = 0;
      for (const idx of face.indices) {
        avgDepth += transformed[idx].depth;
      }
      avgDepth /= face.indices.length;

      // Calculate normal vector for lighting
      const p0 = transformed[face.indices[0]];
      const p1 = transformed[face.indices[1]];
      const p2 = transformed[face.indices[2]];
      const normalZ = (p1.x2d - p0.x2d) * (p2.y2d - p0.y2d) - (p1.y2d - p0.y2d) * (p2.x2d - p0.x2d);

      return { ...face, avgDepth, normalZ };
    }).sort((a, b) => b.avgDepth - a.avgDepth);

    // Render sorted faces
    sortedFaces.forEach((face) => {
      ctx.beginPath();
      const first = transformed[face.indices[0]];
      ctx.moveTo(first.x2d, first.y2d);
      for (let i = 1; i < face.indices.length; i++) {
        const pt = transformed[face.indices[i]];
        ctx.lineTo(pt.x2d, pt.y2d);
      }
      ctx.closePath();

      if (renderMode === 'blueprint') {
        // Blueprint CAD wireframe
        ctx.fillStyle = face.isGlass ? 'rgba(14, 165, 233, 0.12)' : 'rgba(15, 23, 42, 0.55)';
        ctx.fill();
        ctx.strokeStyle = face.wireColor || '#38bdf8';
        ctx.lineWidth = 1.3;
        ctx.stroke();

        // Vertex crosshairs
        for (const idx of face.indices) {
          const pt = transformed[idx];
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(pt.x2d - 1.5, pt.y2d - 1.5, 3, 3);
        }
      } else if (renderMode === 'clay') {
        // Clay studio ambient occlusion
        const lum = Math.max(0.35, Math.min(0.92, 0.65 + (face.normalZ > 0 ? 0.25 : -0.25)));
        const val = Math.round(lum * 240);
        ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
        ctx.fill();
        ctx.strokeStyle = 'rgba(75, 85, 99, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        // Shaded PBR-like lighting
        if (face.isGlass) {
          ctx.fillStyle = 'rgba(20, 184, 166, 0.38)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(45, 212, 191, 0.75)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        } else {
          ctx.fillStyle = face.color;
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    });

    // Render pillars (lines)
    const pillars = [
      [32, 33],
      [34, 35],
    ];
    pillars.forEach(([i1, i2]) => {
      const p1 = transformed[i1];
      const p2 = transformed[i2];
      ctx.beginPath();
      ctx.moveTo(p1.x2d, p1.y2d);
      ctx.lineTo(p2.x2d, p2.y2d);
      ctx.strokeStyle = renderMode === 'blueprint' ? '#38bdf8' : '#e2e8f0';
      ctx.lineWidth = renderMode === 'blueprint' ? 2 : 3;
      ctx.stroke();
    });

    // Dimension annotation overlay for Blueprint
    if (renderMode === 'blueprint') {
      ctx.fillStyle = '#38bdf8';
      ctx.font = '10px monospace';
      ctx.fillText('SPAN: 18.5m', 16, height - 20);
      ctx.fillText('ELEVATION: +7.2m', 16, height - 34);
    }
  }, [renderMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let active = true;
    let visible = !('IntersectionObserver' in window);
    let previousTime: number | null = null;
    const shouldRotate = () => isAutoRotating && !isDragging.current;
    const stop = () => {
      if (animFrameId.current !== null) cancelAnimationFrame(animFrameId.current);
      animFrameId.current = null;
      previousTime = null;
    };
    const loop = (time: number) => {
      animFrameId.current = null;
      if (!active || !visible || document.hidden) return;
      if (shouldRotate()) {
        // Match the original 60 Hz orbit speed at every refresh rate. Clamp a
        // delayed frame so returning to the tab cannot jump the camera.
        const elapsed = previousTime === null ? 0 : Math.min(64, time - previousTime);
        rotY.current += elapsed * 0.00045;
      }
      previousTime = time;
      drawScene();
      if (shouldRotate()) animFrameId.current = requestAnimationFrame(loop);
      else previousTime = null;
    };
    const requestDraw = () => {
      if (active && visible && !document.hidden && animFrameId.current === null) {
        animFrameId.current = requestAnimationFrame(loop);
      }
    };
    requestDrawRef.current = requestDraw;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dimensionsRef.current = { width, height };
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
      requestDraw();
    };
    const intersection = 'IntersectionObserver' in window
      ? new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          if (visible) requestDraw();
          else stop();
        })
      : null;
    intersection?.observe(canvas);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const handleVisibility = () => {
      if (document.hidden) stop();
      else requestDraw();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('resize', resize, { passive: true });
    resize();
    return () => {
      active = false;
      stop();
      requestDrawRef.current = () => {};
      intersection?.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('resize', resize);
    };
  }, [drawScene, isAutoRotating]);

  // Pointer / Mouse Orbit handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    requestDrawRef.current();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    rotY.current += dx * 0.009;
    rotX.current = Math.max(-0.2, Math.min(1.4, rotX.current + dy * 0.009));
    requestDrawRef.current();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDragging.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    requestDrawRef.current();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-0.12, 0], ArrowRight: [0.12, 0],
      ArrowUp: [0, -0.12], ArrowDown: [0, 0.12],
    };
    if (event.key === 'Home') {
      event.preventDefault();
      setCameraPreset('iso');
      return;
    }
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    setIsAutoRotate(false);
    rotY.current += move[0];
    rotX.current = Math.max(-0.2, Math.min(1.4, rotX.current + move[1]));
    requestDrawRef.current();
  };

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-high/40 p-4 sm:p-5 backdrop-blur-sm space-y-4">
      {/* Top Header & Simulation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/60">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/30">
            <Rotate3d size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-label font-bold uppercase tracking-[0.16em] text-primary">
                INTERACTIVE 3D ARCHITECTURAL VIEWPORT
              </span>
              <span className="rounded-md border border-outline-variant/60 bg-surface/80 px-1.5 py-0.5 text-[9px] font-mono text-on-surface-variant">
                Canvas 3D
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant line-clamp-1">
              Drag or use arrow keys to orbit · Shading modes & camera angles
            </p>
          </div>
        </div>

        {/* Viewport Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAutoRotate(!isAutoRotate)}
            aria-pressed={Boolean(isAutoRotating)}
            disabled={Boolean(reducedMotion)}
            title={reducedMotion ? 'Automatic orbit follows your reduced motion preference; drag or use arrow keys to explore.' : 'Toggle automatic orbit'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              isAutoRotating
                ? 'bg-primary/15 border-primary/40 text-primary'
                : 'bg-surface border-outline-variant text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {isAutoRotating ? <Pause size={12} /> : <Play size={12} />}
            <span>{reducedMotion ? 'Manual orbit' : isAutoRotating ? 'Orbiting' : 'Paused'}</span>
          </button>
        </div>
      </div>

      {/* Mode Selectors: Shaders & Cameras */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Render Shaders */}
        <div className="flex items-center gap-1 p-1 rounded-xl border border-outline-variant/70 bg-surface/70">
          <button
            type="button"
            onClick={() => setRenderMode('shaded')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
              renderMode === 'shaded'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Sun size={12} />
            <span>Shaded</span>
          </button>
          <button
            type="button"
            onClick={() => setRenderMode('blueprint')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
              renderMode === 'blueprint'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Grid3X3 size={12} />
            <span>Blueprint CAD</span>
          </button>
          <button
            type="button"
            onClick={() => setRenderMode('clay')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
              renderMode === 'clay'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Palette size={12} />
            <span>Clay</span>
          </button>
        </div>

        {/* Camera Angle Presets */}
        <div className="flex items-center gap-1 p-1 rounded-xl border border-outline-variant/70 bg-surface/70">
          <button
            type="button"
            onClick={() => setCameraPreset('iso')}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition cursor-pointer ${
              cameraAngle === 'iso'
                ? 'bg-surface-container-high text-primary font-bold'
                : 'text-on-surface-variant'
            }`}
          >
            ISO 45°
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('front')}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition cursor-pointer ${
              cameraAngle === 'front'
                ? 'bg-surface-container-high text-primary font-bold'
                : 'text-on-surface-variant'
            }`}
          >
            ELEVATION
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('top')}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition cursor-pointer ${
              cameraAngle === 'top'
                ? 'bg-surface-container-high text-primary font-bold'
                : 'text-on-surface-variant'
            }`}
          >
            TOP PLAN
          </button>
        </div>
      </div>

      {/* 3D Canvas Viewport */}
      <div className="relative w-full h-[230px] sm:h-[260px] rounded-xl border border-outline-variant/80 bg-neutral-950/80 overflow-hidden select-none cursor-grab active:cursor-grabbing">
        <canvas
          ref={canvasRef}
          width={640}
          height={320}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          aria-label="Interactive 3D pavilion. Drag or use arrow keys to orbit. Press Home to reset the camera."
          className="w-full h-full touch-pan-y focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[-2px]"
        >Interactive pavilion model with shaded, blueprint, and clay views.</canvas>

        {/* Interactive Overlay HUD */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-mono text-white/80">
          <Compass size={11} className="text-primary animate-pulse" />
          <span>DRAG TO ORBIT</span>
        </div>

        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-mono text-white/70">
          <span className="text-emerald-400 font-bold">INTERACTIVE</span>
          <span>·</span>
          <span>{FACES.length} FACES</span>
          <span>·</span>
          <span>3D PAVILION</span>
        </div>
      </div>

      {/* Bottom Architectural Pipeline Specs */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-outline-variant/60 text-[10px] font-mono text-on-surface-variant">
        <div className="flex items-center gap-2">
          <span className="text-primary font-bold">PIPELINE:</span>
          <span>Blender 3D Asset ➔ Unity Walkthrough ➔ WebGL Real-time</span>
        </div>

        {onExploreMore && (
          <button
            type="button"
            onClick={onExploreMore}
            className="text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            Case Study <ArrowRight size={10} />
          </button>
        )}
      </div>
    </div>
  );
};
