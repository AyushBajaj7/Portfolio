import sharp from 'sharp';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const projectRoot = resolve('.');
const zipPath = join(projectRoot, 'ezgif-82170996bddeb72f-png-split.zip');
const tempExtractDir = join(projectRoot, 'node_modules', '.cache', 'extracted_pngs');
const stagingDir = join(projectRoot, 'node_modules', '.cache', 'staging_public');
const stagingHighRes = join(stagingDir, 'frames');
const stagingLowRes = join(stagingDir, 'frames-lowres');
const stagingAnchors = join(stagingDir, 'frames-anchors');

const publicDir = join(projectRoot, 'public');
const destHighRes = join(publicDir, 'frames');
const destLowRes = join(publicDir, 'frames-lowres');
const destAnchors = join(publicDir, 'frames-anchors');

if (!existsSync(tempExtractDir)) {
  await mkdir(tempExtractDir, { recursive: true });
}

let extracted = existsSync(tempExtractDir) ? (await readdir(tempExtractDir)).filter(f => f.endsWith('.png')) : [];
if (extracted.length < 300) {
  console.log(`Extracting 300 PNG frames from ${zipPath} into ${tempExtractDir}...`);
  execSync(`powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${zipPath}', '${tempExtractDir}')"`, { stdio: 'inherit' });
  extracted = (await readdir(tempExtractDir)).filter(f => f.endsWith('.png'));
}
console.log(`Found ${extracted.length} extracted raw PNG frames.`);

await mkdir(stagingHighRes, { recursive: true });
await mkdir(stagingLowRes, { recursive: true });
await mkdir(stagingAnchors, { recursive: true });

const sortedFiles = extracted
  .map(name => ({ name, match: /^ezgif-frame-(\d{3})\.png$/i.exec(name) }))
  .filter(e => e.match)
  .sort((a, b) => Number(a.match[1]) - Number(b.match[1]));

console.log(`Processing ${sortedFiles.length} sequential frames with skin-protected chroma key, despill, and smooth falloff...`);

const width = 1280;
const height = 720;
const startTime = Date.now();

// Anchor frame indices (1-indexed, matching Scene.tsx LOW_RES_ANCHOR_KEYFRAMES: 0, 4, 8, ... 296, 299)
const anchorSet = new Set([
  ...Array.from({ length: 75 }, (_, index) => index * 4 + 1),
  300
]);

async function safeWrite(path, buf) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await writeFile(path, buf);
      return;
    } catch (err) {
      if (attempt === 4) throw err;
      await new Promise(r => setTimeout(r, 60));
    }
  }
}

for (let i = 0; i < sortedFiles.length; i++) {
  const { name } = sortedFiles[i];
  const frameIndex = i + 1; // 1..300
  const inputPath = join(tempExtractDir, name);

  const { data, info } = await sharp(inputPath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgba = Buffer.alloc(width * height * 4);
  const rawAlpha = Buffer.alloc(width * height);

  // Pass 1: Skin-protected chroma keying
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const inIdx = idx * 3;

      // Erase Gemini watermark star (x: 1090..1230, y: 540..680)
      if (x >= 1090 && x <= 1230 && y >= 540 && y <= 680) {
        rawAlpha[idx] = 0;
        continue;
      }

      const r = data[inIdx];
      const g = data[inIdx + 1];
      const b = data[inIdx + 2];

      const maxRB = Math.max(r, b);
      const greenExcess = g - maxRB;

      // Skin tones have prominent warm reds (R > 48, R > B + 14, R > G - 6)
      const isSkinTone = (r > 48 && r > b + 14 && (r - g) > -6);

      let alpha = 1.0;
      if (isSkinTone) {
        if (greenExcess > 32 && g > 90) {
          alpha = 0.0;
        } else if (greenExcess > 16 && g > 75) {
          const t = (greenExcess - 16) / 16;
          alpha = 1.0 - (t * t * (3 - 2 * t));
        } else {
          alpha = 1.0;
        }
      } else {
        if (greenExcess > 40) {
          alpha = 0.0;
        } else if (greenExcess > 10) {
          const t = (greenExcess - 10) / 30;
          alpha = 1.0 - (t * t * (3 - 2 * t));
        } else {
          alpha = 1.0;
        }

        if (g > 95 && g > r * 1.30 && g > b * 1.25) {
          alpha = 0.0;
        }
      }

      rawAlpha[idx] = Math.round(alpha * 255);
    }
  }

  // Pass 2: 0.85px Gaussian blur for organic subpixel anti-aliasing without jagged cuts
  const softenedAlpha = await sharp(rawAlpha, {
    raw: { width, height, channels: 1 },
  })
    .blur(0.85)
    .extractChannel(0)
    .raw()
    .toBuffer();

  // Pass 3: Clean despill (preserving pure edge colors without dark tinting) & bottom/side dissolve
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const inIdx = idx * 3;
      const outIdx = idx * 4;

      let a = softenedAlpha[idx];
      if (a < 5) {
        rgba[outIdx] = 0;
        rgba[outIdx + 1] = 0;
        rgba[outIdx + 2] = 0;
        rgba[outIdx + 3] = 0;
        continue;
      }

      let r = data[inIdx];
      let g = data[inIdx + 1];
      let b = data[inIdx + 2];

      // Despill: Suppress green bounce without introducing dark borders
      const maxAllowedG = Math.max(r, b);
      if (g > maxAllowedG) {
        g = Math.round(r * 0.45 + b * 0.55);
      }

      // Torso bottom soft fade: smoothly dissolve bust into background (y: 490..710)
      if (y > 490) {
        const progressY = Math.min(1.0, (y - 490) / 220);
        const fade = 1.0 - (progressY * progressY * (3 - 2 * progressY));
        a = Math.round(a * fade);
      }

      // Torso sides soft fade: smoothly dissolve shoulder/arm cutoffs (x < 370 or x > 910)
      if (y > 460) {
        if (x < 370) {
          const progressLeft = Math.max(0, (x - 250) / 120);
          const fadeLeft = Math.min(1.0, progressLeft * progressLeft * (3 - 2 * progressLeft));
          a = Math.round(a * fadeLeft);
        } else if (x > 910) {
          const progressRight = Math.max(0, (1030 - x) / 120);
          const fadeRight = Math.min(1.0, progressRight * progressRight * (3 - 2 * progressRight));
          a = Math.round(a * fadeRight);
        }
      }

      rgba[outIdx] = r;
      rgba[outIdx + 1] = g;
      rgba[outIdx + 2] = b;
      rgba[outIdx + 3] = a;
    }
  }

  const frameStr = String(frameIndex).padStart(4, '0');
  const highResWebpPath = join(stagingHighRes, `male${frameStr}.webp`);
  const lowResWebpPath = join(stagingLowRes, `male${frameStr}.webp`);
  const anchorWebpPath = join(stagingAnchors, `male${frameStr}.webp`);

  // 1. High-Res WebP (1280x720, quality 94)
  const highResBuf = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .webp({ quality: 94, effort: 4, alphaQuality: 100 })
    .toBuffer();
  await safeWrite(highResWebpPath, highResBuf);

  // 2. Low-Res WebP (960x540, quality 86) - Crisp during scrolling, no pixelation!
  const lowResBuf = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .resize({ width: 960, height: 540, fit: 'fill' })
    .webp({ quality: 86, effort: 3, alphaQuality: 96 })
    .toBuffer();
  await safeWrite(lowResWebpPath, lowResBuf);

  // 3. Anchor frames (960x540, quality 88) - Sharp instant display!
  if (anchorSet.has(frameIndex)) {
    const anchorBuf = await sharp(rgba, { raw: { width, height, channels: 4 } })
      .resize({ width: 960, height: 540, fit: 'fill' })
      .webp({ quality: 88, effort: 3, alphaQuality: 98 })
      .toBuffer();
    await safeWrite(anchorWebpPath, anchorBuf);
  }

  if (frameIndex % 30 === 0 || frameIndex === sortedFiles.length) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Rendered ${frameIndex}/${sortedFiles.length} frames to staging (${elapsed}s elapsed)...`);
  }
}

console.log('Copying rendered frames from staging to public directories...');
execSync(`powershell -Command "Copy-Item -Path '${stagingHighRes}\\*' -Destination '${destHighRes}' -Force"`, { stdio: 'inherit' });
execSync(`powershell -Command "Copy-Item -Path '${stagingLowRes}\\*' -Destination '${destLowRes}' -Force"`, { stdio: 'inherit' });
execSync(`powershell -Command "Copy-Item -Path '${stagingAnchors}\\*' -Destination '${destAnchors}' -Force"`, { stdio: 'inherit' });

console.log('--- Successfully processed and published all 300 avatar frames! ---');
