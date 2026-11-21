// Generates the PWA icons in public/icons from an inline SVG. Run: node scripts/icons.mjs
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const mark = (s) => `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6ee7b7"/><stop offset="1" stop-color="#60a5fa"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.2" cy="0" r="1">
      <stop offset="0" stop-color="#10b981" stop-opacity=".35"/><stop offset="1" stop-color="#10b981" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <g transform="translate(${256 - 128 * s} ${256 - 128 * s}) scale(${s})">
    <rect x="40" y="48" width="48" height="160" rx="18" fill="url(#g)"/>
    <rect x="104" y="48" width="48" height="112" rx="18" fill="url(#g)" opacity=".8"/>
    <rect x="168" y="48" width="48" height="68" rx="18" fill="url(#g)" opacity=".55"/>
  </g>`

const svg = ({ rounded, scale }) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  ${mark(scale)}
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="#0b0d12"/>
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="url(#glow)"/>
  ${mark(scale).replace(/<defs>[\s\S]*<\/defs>/, '')}
</svg>`)

mkdirSync('public/icons', { recursive: true })
const out = [
  ['icon-192.png', 192, { rounded: true, scale: 1.25 }],
  ['icon-512.png', 512, { rounded: true, scale: 1.25 }],
  // Maskable: full-bleed background, mark kept inside the 80% safe zone.
  ['maskable-512.png', 512, { rounded: false, scale: 1.0 }],
  // iOS applies its own corner mask.
  ['apple-touch-icon.png', 180, { rounded: false, scale: 1.15 }],
]
for (const [name, size, opts] of out) {
  await sharp(svg(opts)).resize(size, size).png().toFile(`public/icons/${name}`)
  console.log('ok', name)
}

// Android status-bar badge: white silhouette on transparent.
const badge = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="#fff">
  <rect x="40" y="48" width="48" height="160" rx="18"/><rect x="104" y="48" width="48" height="112" rx="18"/><rect x="168" y="48" width="48" height="68" rx="18"/>
</svg>`)
await sharp(badge).resize(96, 96).png().toFile('public/icons/badge-96.png')
console.log('ok badge-96.png')
