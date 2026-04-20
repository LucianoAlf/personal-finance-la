import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE = resolve('public/ana-clara-avatar.png');
const PUBLIC_DIR = resolve('public');

if (!existsSync(SOURCE)) {
  console.error(`Source not found: ${SOURCE}`);
  process.exit(1);
}

const SIZES = [512, 128];

async function optimize() {
  for (const size of SIZES) {
    const webpOut = resolve(PUBLIC_DIR, `ana-clara-avatar-${size}.webp`);
    const pngOut = resolve(PUBLIC_DIR, `ana-clara-avatar-${size}.png`);

    await sharp(SOURCE)
      .resize(size, size, { fit: 'cover', position: 'top' })
      .webp({ quality: 82 })
      .toFile(webpOut);

    await sharp(SOURCE)
      .resize(size, size, { fit: 'cover', position: 'top' })
      .png({ compressionLevel: 9, palette: true })
      .toFile(pngOut);

    console.log(`✓ ${size}×${size} → webp + png`);
  }
}

optimize().catch((err) => {
  console.error(err);
  process.exit(1);
});
