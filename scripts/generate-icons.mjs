import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// SVG icon with dark background and padding for maskable icons
// Safe zone for maskable is inner 80%, so we add 10% padding on each side
const createSvg = (size, padding = 0) => {
  const iconSize = size - (padding * 2);
  const scale = iconSize / 24;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#1a1a1a"/>
  <g transform="translate(${padding}, ${padding}) scale(${scale})">
    <path d="m18.226 5.226-2.52-2.52A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-.351" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M21.378 12.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M8 18h1" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
};

async function generateIcons() {
  const sizes = [192, 512];

  for (const size of sizes) {
    // Regular icon (no extra padding)
    const regularSvg = createSvg(size, size * 0.15); // 15% padding looks balanced
    const regularPng = await sharp(Buffer.from(regularSvg)).png().toBuffer();
    writeFileSync(join(publicDir, `pwa-${size}x${size}.png`), regularPng);
    console.log(`Generated pwa-${size}x${size}.png`);
  }

  // Apple touch icon (180x180)
  const appleSvg = createSvg(180, 180 * 0.15);
  const applePng = await sharp(Buffer.from(appleSvg)).png().toBuffer();
  writeFileSync(join(publicDir, 'apple-touch-icon.png'), applePng);
  console.log('Generated apple-touch-icon.png');
}

generateIcons().catch(console.error);
