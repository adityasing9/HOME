import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const publicDir = path.resolve('public');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#090d16" />
    </linearGradient>
    <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#6366f1" />
    </linearGradient>
    <linearGradient id="roofGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60a5fa" />
      <stop offset="100%" stop-color="#818cf8" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Base with subtle border -->
  <rect x="16" y="16" width="480" height="480" rx="112" fill="url(#bgGrad)" stroke="rgba(255,255,255,0.12)" stroke-width="6" />

  <!-- Subtle glow beneath mark -->
  <g filter="url(#glow)" opacity="0.6">
    <path d="M 256 120 L 372 216 L 372 384 C 372 396 362 406 350 406 L 306 406 C 294 406 284 396 284 384 L 284 290 L 228 290 L 228 384 C 228 396 218 406 206 406 L 162 406 C 150 406 140 396 140 384 L 140 216 Z" fill="url(#brandGrad)" />
  </g>

  <!-- Modern Architectural "H" + Home Apex Geometry -->
  <!-- Left Pillar -->
  <rect x="148" y="210" width="56" height="180" rx="28" fill="url(#brandGrad)" />

  <!-- Right Pillar -->
  <rect x="308" y="210" width="56" height="180" rx="28" fill="url(#brandGrad)" />

  <!-- Horizontal Crossbar Bridge -->
  <rect x="180" y="268" width="152" height="48" rx="24" fill="url(#brandGrad)" />

  <!-- Geometric Home Roofline Apex Floating Above / Integrated -->
  <path d="M 148 196 L 256 112 L 364 196" fill="none" stroke="url(#roofGrad)" stroke-width="44" stroke-linecap="round" stroke-linejoin="round" />

  <!-- Central Modern Core Dot -->
  <circle cx="256" cy="204" r="16" fill="#ffffff" opacity="0.9" />
</svg>`;

// Write favicon.svg
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent, 'utf-8');
console.log('Saved favicon.svg');

// Render PNGs
async function generatePngs() {
  const svgBuffer = Buffer.from(svgContent);

  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'home-icon-192.png'));
  console.log('Generated home-icon-192.png');

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'home-icon-512.png'));
  console.log('Generated home-icon-512.png');

  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');
}

generatePngs().catch(console.error);
