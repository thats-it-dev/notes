/**
 * Generate PWA icons from SVG
 *
 * Run: node scripts/generate-icons.js
 *
 * Requires: npm install -D sharp
 * Or use an online tool like https://realfavicongenerator.net
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// Check if sharp is available
async function generateIcons() {
  try {
    const sharp = (await import('sharp')).default;

    const svgBuffer = readFileSync(join(publicDir, 'favicon.svg'));

    // Generate different sizes
    const sizes = [
      { name: 'pwa-192x192.png', size: 192 },
      { name: 'pwa-512x512.png', size: 512 },
      { name: 'apple-touch-icon.png', size: 180 },
    ];

    for (const { name, size } of sizes) {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(join(publicDir, name));

      console.log(`Generated ${name}`);
    }

    console.log('All icons generated successfully!');
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      console.log('Sharp not installed. Install it with: pnpm add -D sharp');
      console.log('Or generate icons manually using https://realfavicongenerator.net');
    } else {
      throw err;
    }
  }
}

generateIcons();
