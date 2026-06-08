import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sceneFile = path.resolve(__dirname, '../src/components/canvas/Scene.tsx');

let code = fs.readFileSync(sceneFile, 'utf8');

// 1. Replacements for state and caches
const search1 = `  const imageCache = useRef(new Map<number, HTMLImageElement>());
  const pendingFramesRef = useRef(new Set<number>());`;
const replace1 = `  const lowResCache = useRef(new Map<number, HTMLImageElement>());
  const highResCache = useRef(new Map<number, HTMLImageElement>());
  const lowResControllers = useRef(new Map<number, AbortController>());
  const highResControllers = useRef(new Map<number, AbortController>());
  const pendingLowFramesRef = useRef(new Set<number>());`;
code = code.replace(search1, replace1);

// 2. Replacements for getFrameSrc and getFrame and abortControllers
const search2 = `  const abortControllers = useRef(new Map<number, AbortController>());

  const getFrameSrc = useCallback((index: number) => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const frameNumber = String(index + 1).padStart(4, '0');
    return \`\${baseUrl}frames/male\${frameNumber}.png\`;
  }, []);

  const getFrame = useCallback((index: number) => {
    const safeIndex = Math.min(FRAME_COUNT - 1, Math.max(0, index));
    const cached = imageCache.current.get(safeIndex);
    if (cached) {
      imageCache.current.delete(safeIndex);
      imageCache.current.set(safeIndex, cached);
      return cached;
    }

    const img = new Image();
    img.decoding = 'async';
    
    const controller = new AbortController();
    abortControllers.current.set(safeIndex, controller);

    fetch(getFrameSrc(safeIndex), { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.blob();
      })
      .then((blob) => {
        img.src = URL.createObjectURL(blob);
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          pendingFramesRef.current.delete(safeIndex);
          imageCache.current.delete(safeIndex);
        } else {
          console.error('Error loading frame:', safeIndex, err);
        }
      })
      .finally(() => {
        abortControllers.current.delete(safeIndex);
      });

    imageCache.current.set(safeIndex, img);

    while (imageCache.current.size > MAX_CACHED_FRAMES) {
      const oldestIndex = imageCache.current.keys().next().value as number | undefined;
      if (oldestIndex === undefined) break;
      if (oldestIndex === safeIndex || oldestIndex === desiredFrameIndexRef.current) {
        const oldestImage = imageCache.current.get(oldestIndex);
        imageCache.current.delete(oldestIndex);
        if (oldestImage) imageCache.current.set(oldestIndex, oldestImage);
        continue;
      }
      
      const oldestController = abortControllers.current.get(oldestIndex);
      if (oldestController) {
        oldestController.abort();
        abortControllers.current.delete(oldestIndex);
      }
      
      const oldestImage = imageCache.current.get(oldestIndex);
      if (oldestImage && oldestImage.src.startsWith('blob:')) {
        URL.revokeObjectURL(oldestImage.src);
      }
      
      imageCache.current.delete(oldestIndex);
      pendingFramesRef.current.delete(oldestIndex);
    }

    return img;
  }, [getFrameSrc]);`;

const replace2 = `  const getFrameSrc = useCallback((index: number, quality: 'low' | 'high' = 'low') => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const frameNumber = String(index + 1).padStart(4, '0');
    return quality === 'high' 
      ? \`\${baseUrl}frames/male\${frameNumber}.png\`
      : \`\${baseUrl}frames-lowres/male\${frameNumber}.jpg\`;
  }, []);

  const getFrame = useCallback((index: number) => {
    const safeIndex = Math.min(FRAME_COUNT - 1, Math.max(0, index));
    
    const highCached = highResCache.current.get(safeIndex);
    if (highCached) {
      highResCache.current.delete(safeIndex);
      highResCache.current.set(safeIndex, highCached);
      return highCached;
    }

    const lowCached = lowResCache.current.get(safeIndex);
    if (lowCached) {
      lowResCache.current.delete(safeIndex);
      lowResCache.current.set(safeIndex, lowCached);
      return lowCached;
    }

    const img = new Image();
    img.decoding = 'async';
    
    const controller = new AbortController();
    lowResControllers.current.set(safeIndex, controller);

    fetch(getFrameSrc(safeIndex, 'low'), { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.blob();
      })
      .then((blob) => {
        img.src = URL.createObjectURL(blob);
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          pendingLowFramesRef.current.delete(safeIndex);
          lowResCache.current.delete(safeIndex);
        } else {
          console.error('Error loading low-res frame:', safeIndex, err);
        }
      })
      .finally(() => {
        lowResControllers.current.delete(safeIndex);
      });

    lowResCache.current.set(safeIndex, img);

    const MAX_LOW_CACHED = 120;
    while (lowResCache.current.size > MAX_LOW_CACHED) {
      const oldestIndex = lowResCache.current.keys().next().value as number | undefined;
      if (oldestIndex === undefined) break;
      if (oldestIndex === safeIndex || oldestIndex === desiredFrameIndexRef.current) {
        const oldestImage = lowResCache.current.get(oldestIndex);
        lowResCache.current.delete(oldestIndex);
        if (oldestImage) lowResCache.current.set(oldestIndex, oldestImage);
        continue;
      }
      
      const oldestController = lowResControllers.current.get(oldestIndex);
      if (oldestController) {
        oldestController.abort();
        lowResControllers.current.delete(oldestIndex);
      }
      
      const oldestImage = lowResCache.current.get(oldestIndex);
      if (oldestImage && oldestImage.src.startsWith('blob:')) {
        URL.revokeObjectURL(oldestImage.src);
      }
      
      lowResCache.current.delete(oldestIndex);
      pendingLowFramesRef.current.delete(oldestIndex);
    }

    return img;
  }, [getFrameSrc]);

  const fetchHighRes = useCallback((index: number) => {
    const safeIndex = Math.min(FRAME_COUNT - 1, Math.max(0, index));
    if (highResCache.current.has(safeIndex)) return;
    if (highResControllers.current.has(safeIndex)) return;

    highResControllers.current.forEach((controller) => {
      controller.abort();
    });
    highResControllers.current.clear();

    const img = new Image();
    img.decoding = 'async';
    
    const controller = new AbortController();
    highResControllers.current.set(safeIndex, controller);

    fetch(getFrameSrc(safeIndex, 'high'), { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.blob();
      })
      .then((blob) => {
        img.src = URL.createObjectURL(blob);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Error loading high-res frame:', safeIndex, err);
        }
      })
      .finally(() => {
        highResControllers.current.delete(safeIndex);
      });

    img.addEventListener('load', () => {
      highResCache.current.set(safeIndex, img);
      
      if (desiredFrameIndexRef.current === safeIndex) {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
          scaleImage(img, ctx);
        }
      }

      const MAX_HIGH_CACHED = 10;
      while (highResCache.current.size > MAX_HIGH_CACHED) {
        const oldestIndex = highResCache.current.keys().next().value as number | undefined;
        if (oldestIndex === undefined) break;
        if (oldestIndex === safeIndex || oldestIndex === desiredFrameIndexRef.current) {
          const oldestImage = highResCache.current.get(oldestIndex);
          highResCache.current.delete(oldestIndex);
          if (oldestImage) highResCache.current.set(oldestIndex, oldestImage);
          continue;
        }
        
        const oldestImage = highResCache.current.get(oldestIndex);
        if (oldestImage && oldestImage.src.startsWith('blob:')) {
          URL.revokeObjectURL(oldestImage.src);
        }
        highResCache.current.delete(oldestIndex);
      }
    }, { once: true });
  }, [getFrameSrc]);`;
code = code.replace(search2, replace2);

// 3. pendingFramesRef replacements in drawFrame
const search3 = `    if (pendingFramesRef.current.has(safeIndex)) return;
    pendingFramesRef.current.add(safeIndex);

    frame.addEventListener(
      'load',
      () => {
        pendingFramesRef.current.delete(safeIndex);`;
const replace3 = `    if (pendingLowFramesRef.current.has(safeIndex)) return;
    pendingLowFramesRef.current.add(safeIndex);

    frame.addEventListener(
      'load',
      () => {
        pendingLowFramesRef.current.delete(safeIndex);`;
code = code.replace(search3, replace3);

// 4. animate settled logic
const search4 = `      if (!settled) {
        poseAnimationRef.current = window.requestAnimationFrame(animate);
      }
    };

    poseAnimationRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (poseAnimationRef.current !== null) {
        window.cancelAnimationFrame(poseAnimationRef.current);
      }
    };
  }, [activeSection, applyPose, horizontalProgress, scrollMode, scrollProgress]);`;

const replace4 = `      if (!settled) {
        poseAnimationRef.current = window.requestAnimationFrame(animate);
      } else {
        fetchHighRes(frameIndexRef.current);
      }
    };

    poseAnimationRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (poseAnimationRef.current !== null) {
        window.cancelAnimationFrame(poseAnimationRef.current);
      }
    };
  }, [activeSection, applyPose, horizontalProgress, scrollMode, scrollProgress, fetchHighRes]);`;
code = code.replace(search4, replace4);

fs.writeFileSync(sceneFile, code);
console.log('Patched Scene.tsx perfectly.');
