import type { Background } from './types'

/** Ready-made backgrounds: layered gradients over a dark base so the glass columns stay legible. */
export const PRESETS: { id: string; name: string; css: string }[] = [
  {
    id: 'aurora',
    name: 'Aurora',
    css: `radial-gradient(60rem 30rem at 10% -10%, rgb(16 185 129 / .16), transparent 60%),
          radial-gradient(50rem 30rem at 90% -20%, rgb(59 130 246 / .16), transparent 60%),
          radial-gradient(40rem 30rem at 50% 120%, rgb(168 85 247 / .08), transparent 60%), #07080b`,
  },
  {
    id: 'oceano',
    name: 'Oceano',
    css: `radial-gradient(70rem 40rem at 0% 0%, rgb(14 165 233 / .32), transparent 60%),
          radial-gradient(60rem 40rem at 100% 100%, rgb(20 184 166 / .26), transparent 60%), #061018`,
  },
  {
    id: 'por-do-sol',
    name: 'Pôr do sol',
    css: `radial-gradient(70rem 40rem at 100% 0%, rgb(251 146 60 / .30), transparent 60%),
          radial-gradient(60rem 40rem at 0% 100%, rgb(244 63 94 / .28), transparent 60%), #140a0c`,
  },
  {
    id: 'ametista',
    name: 'Ametista',
    css: `radial-gradient(70rem 40rem at 20% 0%, rgb(168 85 247 / .32), transparent 60%),
          radial-gradient(60rem 40rem at 90% 100%, rgb(236 72 153 / .22), transparent 60%), #0e0815`,
  },
  {
    id: 'floresta',
    name: 'Floresta',
    css: `radial-gradient(70rem 40rem at 0% 100%, rgb(34 197 94 / .26), transparent 60%),
          radial-gradient(60rem 40rem at 100% 0%, rgb(132 204 22 / .14), transparent 60%), #07110b`,
  },
  {
    id: 'ouro',
    name: 'Dourado',
    css: `radial-gradient(70rem 40rem at 50% -20%, rgb(234 179 8 / .26), transparent 60%),
          radial-gradient(50rem 30rem at 100% 100%, rgb(180 83 9 / .20), transparent 60%), #0f0c06`,
  },
  {
    id: 'meia-noite',
    name: 'Meia-noite',
    css: `radial-gradient(80rem 50rem at 50% 120%, rgb(79 70 229 / .30), transparent 60%),
          linear-gradient(180deg, #05060d, #0a0d1f)`,
  },
  {
    id: 'grafite',
    name: 'Grafite',
    css: `radial-gradient(60rem 40rem at 50% 0%, rgb(255 255 255 / .05), transparent 60%), #0b0c0f`,
  },
]

export const DEFAULT_BACKGROUND: Background = { source: { kind: 'preset', id: 'aurora' }, dim: 0, blur: false }

/** CSS `background` for a background choice (without the dim veil). */
export function backgroundCss(bg: Background): string {
  const s = bg.source
  if (s.kind === 'color') return `radial-gradient(60rem 40rem at 20% 0%, rgb(255 255 255 / .06), transparent 60%), ${s.color}`
  if (s.kind === 'image') return `center / cover no-repeat url("${s.url}"), #07080b`
  return (PRESETS.find((p) => p.id === s.id) ?? PRESETS[0]).css
}

/** Fixed layer painted behind the whole app. */
export function Backdrop({ bg }: { bg: Background }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-950">
      <div
        className="absolute inset-0 transition-[background] duration-500"
        style={{
          background: backgroundCss(bg),
          // Slight overscan so the blur doesn't show soft edges.
          ...(bg.blur ? { filter: 'blur(18px)', transform: 'scale(1.08)' } : null),
        }}
      />
      <div className="absolute inset-0 bg-black transition-opacity duration-300" style={{ opacity: bg.dim }} />
    </div>
  )
}

/** Downscale an uploaded photo to a JPEG data URL small enough to store with the user. */
export async function compressImage(file: File, maxSide = 1920, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', quality)
}
