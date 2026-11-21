import type { Formato, Mandato } from '../types'

export const MANDATOS: Record<Mandato, { label: string; short: string; tone: string; dot: string }> = {
  JC: { label: 'Vereador Julio Cezar', short: 'Julio Cezar', tone: 'text-sky-300 bg-sky-400/10 ring-sky-400/20', dot: 'bg-sky-400' },
  AM: { label: 'Deputada Aurelina Medeiros', short: 'Aurelina', tone: 'text-emerald-300 bg-emerald-400/10 ring-emerald-400/20', dot: 'bg-emerald-400' },
  AMBOS: { label: 'Ambos os mandatos', short: 'JC + AM', tone: 'text-amber-200 bg-amber-300/10 ring-amber-300/20', dot: 'bg-amber-300' },
}

export const FORMATOS: Formato[] = ['Post', 'Stories', 'Carrossel', 'Reels', 'Vídeo', 'Arte', 'Cobertura']

/** Gradient themes used as a cover when the card has no image. */
export const COVER_THEMES = [
  'from-emerald-500/80 via-teal-600/70 to-sky-700/80',
  'from-sky-500/80 via-indigo-600/70 to-violet-700/80',
  'from-rose-500/80 via-red-600/70 to-orange-600/80',
  'from-amber-400/80 via-orange-500/70 to-rose-600/80',
  'from-fuchsia-500/80 via-purple-600/70 to-indigo-700/80',
  'from-zinc-600/80 via-zinc-700/70 to-zinc-900/80',
]
