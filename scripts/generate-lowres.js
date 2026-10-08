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
    const sourceFiles = files.filter(file => /\.(png|webp)$/i.test(file));

    console.log(`Found ${sourceFiles.length} source frames. Generating low-res WebPs with transparency...`);

    let processed = 0;
    const total = sourceFiles.length;

    // Process in batches to avoid memory issues and too many open files
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = sourceFiles.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (file) => {
        const inputPath = path.join(INPUT_DIR, file);
        // Use .webp extension - supports transparency unlike JPEG
        const outputFilename = file.replace(/\.(png|webp)$/i, '.webp');
        const outputPath = path.join(OUTPUT_DIR, outputFilename);

        // Resize to 50% and convert to WebP (supports alpha channel = no black background)
        const metadata = await sharp(inputPath).metadata();
        const width = Math.round((metadata.width || 1920) * 0.5);

        await sharp(inputPath)
          .resize({ width })
          .webp({ quality: 78, effort: 4, alphaQuality: 95 })
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
