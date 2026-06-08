import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const INPUT_DIR = path.join(rootDir, 'public', 'frames');
const OUTPUT_DIR = path.join(rootDir, 'public', 'frames-lowres');

async function processFrames() {
  try {
    // Clear and recreate output directory to remove stale .jpg files
    await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // Read all files from input directory
    const files = await fs.readdir(INPUT_DIR);
    const pngFiles = files.filter(file => file.endsWith('.png'));

    console.log(`Found ${pngFiles.length} PNG frames. Generating low-res WebPs with transparency...`);

    let processed = 0;
    const total = pngFiles.length;

    // Process in batches to avoid memory issues and too many open files
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = pngFiles.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (file) => {
        const inputPath = path.join(INPUT_DIR, file);
        // Use .webp extension - supports transparency unlike JPEG
        const outputFilename = file.replace('.png', '.webp');
        const outputPath = path.join(OUTPUT_DIR, outputFilename);

        // Resize to 50% and convert to WebP (supports alpha channel = no black background)
        const metadata = await sharp(inputPath).metadata();
        const width = Math.round((metadata.width || 1920) * 0.5);

        await sharp(inputPath)
          .resize({ width })
          .webp({ quality: 50, effort: 4, alphaQuality: 80 })
          .toFile(outputPath);

        processed++;
        if (processed % 50 === 0 || processed === total) {
          console.log(`Processed ${processed}/${total} frames...`);
        }
      }));
    }

    console.log('Finished generating low-res WebP frames!');
  } catch (err) {
    console.error('Error generating low-res frames:', err);
    process.exit(1);
  }
}

processFrames();
