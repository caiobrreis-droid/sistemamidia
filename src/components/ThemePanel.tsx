import clsx from 'clsx'
import { motion } from 'motion/react'
import { Check, ImagePlus, Palette, RotateCcw, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { backgroundCss, compressImage, DEFAULT_BACKGROUND, PRESETS } from '../backgrounds'
import type { Background } from '../types'

const SWATCHES = ['#0b0d12', '#0f172a', '#1e1b4b', '#3b0764', '#4c0519', '#422006', '#052e16', '#083344']

interface Props {
  bg: Background
  onChange: (bg: Background) => void
  onClose: () => void
  onError: (msg: string) => void
}

/** Personal background picker. Changes preview live and are saved for this user only. */
export function ThemePanel({ bg, onChange, onClose, onError }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const s = bg.source
  const set = (p: Partial<Background>) => onChange({ ...bg, ...p })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const onFile = async (file?: File) => {
    if (!file) return
    setBusy(true)
    try {
      const url = await compressImage(file)
      // Photos need a veil so the board stays readable; keep the user's value if they already set one.
      onChange({ ...bg, source: { kind: 'image', url }, dim: bg.dim || 0.45 })
    } catch {
      onError('Não foi possível ler essa imagem')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] sm:items-stretch sm:justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label="Plano de fundo"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="scroll-thin flex max-h-[88dvh] w-full flex-col overflow-y-auto rounded-t-[28px] bg-ink-900/95 ring-1 ring-white/10 shadow-[0_-20px_80px_-20px_rgb(0_0_0/0.9)] backdrop-blur-2xl sm:m-3 sm:max-h-none sm:w-[400px] sm:rounded-[28px]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-ink-900/90 px-6 pt-5 pb-4 backdrop-blur-xl">
          <div>
            <h2 className="flex items-center gap-2 font-display text-3xl leading-none text-white">Plano de fundo</h2>
            <p className="mt-1.5 text-[12.5px] text-zinc-500">Só você vê. Vale em todos os seus aparelhos.</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="grid size-9 place-items-center rounded-full text-zinc-400 hover:bg-white/[0.06] hover:text-white">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-7 px-6 pb-[calc(env(safe-area-inset-bottom)+28px)]">
          {/* Live preview */}
          <div className="relative h-28 overflow-hidden rounded-2xl ring-1 ring-white/10">
            <div className="absolute inset-0" style={{ background: backgroundCss(bg), ...(bg.blur ? { filter: 'blur(8px)', transform: 'scale(1.1)' } : null) }} />
            <div className="absolute inset-0 bg-black" style={{ opacity: bg.dim }} />
            <div className="absolute inset-x-4 bottom-4 flex gap-2">
              {[0.9, 0.6, 0.75].map((h, i) => (
                <div key={i} className="flex-1 rounded-xl bg-ink-900/60 p-2 ring-1 ring-white/[0.06] backdrop-blur-xl">
                  <div className="h-2 w-1/2 rounded-full bg-white/30" />
                  <div className="mt-2 rounded-md bg-white/10" style={{ height: 26 * h }} />
                </div>
              ))}
            </div>
          </div>

          <Section title="Prontos">
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map((p) => {
                const on = s.kind === 'preset' && s.id === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => set({ source: { kind: 'preset', id: p.id } })}
                    aria-pressed={on}
                    className="group text-left"
                  >
                    <span
                      className={clsx('relative block aspect-square overflow-hidden rounded-2xl ring-2 transition-all', on ? 'ring-white' : 'ring-white/[0.06] group-hover:ring-white/25')}
                      style={{ background: p.css }}
                    >
                      {on && (
                        <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-white text-ink-950">
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                      )}
                    </span>
                    <span className={clsx('mt-1.5 block truncate text-[11.5px]', on ? 'text-white' : 'text-zinc-500')}>{p.name}</span>
                  </button>
                )
              })}
            </div>
          </Section>

          <Section title="Cor sólida">
            <div className="flex flex-wrap items-center gap-2">
              {SWATCHES.map((c) => {
                const on = s.kind === 'color' && s.color.toLowerCase() === c
                return (
                  <button
                    key={c}
                    onClick={() => set({ source: { kind: 'color', color: c } })}
                    aria-label={`Cor ${c}`}
                    aria-pressed={on}
                    className={clsx('size-9 rounded-full ring-2 ring-offset-2 ring-offset-ink-900 transition-all', on ? 'ring-white' : 'ring-transparent hover:ring-white/25')}
                    style={{ background: c, boxShadow: 'inset 0 0 0 1px rgb(255 255 255 / .1)' }}
                  />
                )
              })}
              <label
                className={clsx(
                  'relative grid size-9 cursor-pointer place-items-center rounded-full ring-2 ring-offset-2 ring-offset-ink-900',
                  s.kind === 'color' && !SWATCHES.includes(s.color.toLowerCase()) ? 'ring-white' : 'ring-transparent hover:ring-white/25',
                )}
                style={{ background: 'conic-gradient(from 0deg, #f43f5e, #f59e0b, #84cc16, #06b6d4, #6366f1, #d946ef, #f43f5e)' }}
                title="Escolher qualquer cor"
              >
                <Palette className="size-4 text-white drop-shadow" />
                <input
                  type="color"
                  value={s.kind === 'color' ? s.color : '#1e1b4b'}
                  onChange={(e) => set({ source: { kind: 'color', color: e.target.value } })}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Escolher qualquer cor"
                />
              </label>
            </div>
          </Section>

          <Section title="Sua imagem">
            <div className="flex gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white/[0.04] px-4 py-3 text-[13px] font-medium text-zinc-200 ring-1 ring-white/[0.08] transition-colors hover:bg-white/[0.07] disabled:opacity-50"
              >
                <ImagePlus className="size-4" />
                {busy ? 'Preparando…' : s.kind === 'image' ? 'Trocar imagem' : 'Enviar foto ou arte'}
              </button>
              {s.kind === 'image' && (
                <button
                  onClick={() => set({ source: DEFAULT_BACKGROUND.source })}
                  aria-label="Remover imagem"
                  className="grid w-12 place-items-center rounded-2xl text-zinc-500 ring-1 ring-white/[0.08] hover:bg-rose-500/10 hover:text-rose-300"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          </Section>

          <Section title="Ajustes">
            <label className="block">
              <span className="flex justify-between text-[12.5px] text-zinc-400">
                Escurecer <span className="text-zinc-500 tabular-nums">{Math.round(bg.dim * 100)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={0.85}
                step={0.05}
                value={bg.dim}
                onChange={(e) => set({ dim: Number(e.target.value) })}
                className="mt-2 w-full accent-emerald-400"
              />
            </label>
            <button
              role="switch"
              aria-checked={bg.blur}
              onClick={() => set({ blur: !bg.blur })}
              className="mt-4 flex w-full items-center justify-between text-[12.5px] text-zinc-400"
            >
              Desfocar o fundo
              <span className={clsx('relative h-6 w-10 rounded-full transition-colors', bg.blur ? 'bg-emerald-400' : 'bg-white/10')}>
                <span className={clsx('absolute top-1 size-4 rounded-full bg-white shadow transition-[left] duration-200', bg.blur ? 'left-5' : 'left-1')} />
              </span>
            </button>
          </Section>

          <button
            onClick={() => onChange(DEFAULT_BACKGROUND)}
            className="flex items-center gap-2 text-[12.5px] text-zinc-500 underline-offset-4 hover:text-zinc-200 hover:underline"
          >
            <RotateCcw className="size-3.5" /> Voltar ao padrão
          </button>
        </div>
      </motion.aside>
    </motion.div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <p className="mb-3 text-[11px] font-medium tracking-[0.12em] text-zinc-500 uppercase">{title}</p>
      {children}
    </section>
  )
}
