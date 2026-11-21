import clsx from 'clsx'
import { AnimatePresence } from 'motion/react'
import { Bell, BellOff, BellRing, Download } from 'lucide-react'
import { useState } from 'react'
import { usePush, useInstall } from '../pwa'
import { InstallGuide } from './InstallGuide'

const PUSH_LABEL = {
  on: 'Notificações ativadas (clique para desativar)',
  off: 'Ativar notificações',
  denied: 'Notificações bloqueadas no navegador. Libere nas configurações do site.',
  'needs-install': 'No iPhone, instale o app para receber notificações',
  unsupported: 'Este navegador não suporta notificações',
  loading: 'Configurando…',
} as const

/** "Instalar app" + notification bell, shown in the top bar. */
export function AppActions({ onError }: { onError: (msg: string) => void }) {
  const { canPrompt, install, installed } = useInstall()
  const push = usePush()
  const [guide, setGuide] = useState(false)

  const onInstall = async () => {
    if (canPrompt) await install()
    else setGuide(true)
  }

  const onBell = async () => {
    try {
      if (push.state === 'on') await push.disable()
      else if (push.state === 'off') await push.enable()
      else if (push.state === 'needs-install') setGuide(true)
      else if (push.state === 'denied' || push.state === 'unsupported') onError(PUSH_LABEL[push.state])
    } catch (e) {
      onError((e as Error).message)
    }
  }

  const BellIcon = push.state === 'on' ? BellRing : push.state === 'denied' || push.state === 'unsupported' ? BellOff : Bell

  return (
    <>
      {!installed && (
        <button
          onClick={onInstall}
          className="hidden h-10 items-center gap-2 rounded-full px-3.5 text-[12.5px] font-medium text-zinc-300 ring-1 ring-white/[0.08] transition-colors hover:bg-white/[0.05] hover:text-white sm:inline-flex"
        >
          <Download className="size-4" /> Instalar app
        </button>
      )}
      <button
        onClick={onBell}
        title={PUSH_LABEL[push.state]}
        aria-label={PUSH_LABEL[push.state]}
        aria-pressed={push.state === 'on'}
        className={clsx(
          'relative grid size-10 shrink-0 place-items-center rounded-full ring-1 transition-colors',
          push.state === 'on' ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/25' : 'text-zinc-400 ring-white/[0.08] hover:bg-white/[0.05] hover:text-white',
          push.state === 'loading' && 'animate-pulse',
        )}
      >
        <BellIcon className="size-4" />
        {push.state === 'off' && <span className="absolute top-2 right-2.5 size-2 rounded-full bg-amber-400 ring-2 ring-ink-950" />}
      </button>
      {/* Small screens: install lives next to the bell as an icon. */}
      {!installed && (
        <button onClick={onInstall} aria-label="Instalar app" className="grid size-10 shrink-0 place-items-center rounded-full text-zinc-400 ring-1 ring-white/[0.08] sm:hidden">
          <Download className="size-4" />
        </button>
      )}
      <AnimatePresence>{guide && <InstallGuide onClose={() => setGuide(false)} />}</AnimatePresence>
    </>
  )
}
