import { motion } from 'motion/react'
import { Monitor, PlusSquare, Share, Smartphone, X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { isIOS } from '../pwa'

/** Manual install steps, for browsers without an install prompt (iPhone/Safari, Firefox…). */
export function InstallGuide({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 p-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-[calc(env(safe-area-inset-bottom)+16px)] backdrop-blur-sm sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Instalar o app"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md rounded-[28px] bg-ink-900 p-6 ring-1 ring-white/10 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/icons/icon-192.png" alt="" className="size-12 rounded-2xl" />
            <div>
              <h2 className="font-display text-3xl leading-none text-white">Instalar o app</h2>
              <p className="mt-1 text-[12.5px] text-zinc-500">Abre em tela cheia e recebe notificações</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="grid size-9 place-items-center rounded-full text-zinc-400 hover:bg-white/[0.06] hover:text-white">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <Group icon={<Smartphone className="size-4" />} title="iPhone / iPad (Safari)" highlight={isIOS}>
            <Step n={1}>
              Toque em <Share className="mx-0.5 inline size-4 text-sky-300" /> <b>Compartilhar</b> na barra do Safari.
            </Step>
            <Step n={2}>
              Escolha <PlusSquare className="mx-0.5 inline size-4" /> <b>Adicionar à Tela de Início</b>.
            </Step>
            <Step n={3}>Abra pelo ícone novo e ative as notificações no menu do seu avatar.</Step>
          </Group>
          <Group icon={<Smartphone className="size-4" />} title="Android (Chrome)">
            <Step n={1}>
              Toque no menu <b>⋮</b> e em <b>Instalar app</b> (ou <b>Adicionar à tela inicial</b>).
            </Step>
          </Group>
          <Group icon={<Monitor className="size-4" />} title="Computador (Chrome ou Edge)">
            <Step n={1}>
              Clique no ícone de instalar no fim da barra de endereço, ou no menu <b>⋮</b> → <b>Instalar Estúdio Mídia</b>.
            </Step>
          </Group>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Group({ icon, title, highlight, children }: { icon: ReactNode; title: string; highlight?: boolean; children: ReactNode }) {
  return (
    <section className={highlight ? 'rounded-2xl bg-emerald-400/[0.06] p-4 ring-1 ring-emerald-400/20' : 'px-1'}>
      <p className="mb-2 flex items-center gap-2 text-[12px] font-medium tracking-[0.1em] text-zinc-400 uppercase">
        {icon}
        {title}
      </p>
      <ol className="space-y-2">{children}</ol>
    </section>
  )
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3 text-[13.5px] leading-relaxed text-zinc-300">
      <span className="grid size-5 shrink-0 translate-y-0.5 place-items-center rounded-full bg-white/[0.08] text-[11px] font-semibold text-zinc-300">{n}</span>
      <span>{children}</span>
    </li>
  )
}
