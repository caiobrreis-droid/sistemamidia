import clsx from 'clsx'
import { AnimatePresence } from 'motion/react'
import { AlertTriangle, CalendarClock, Plus, Search, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Board } from './components/Board'
import { CardModal } from './components/CardModal'
import { Avatar } from './components/Avatar'
import { TeamModal } from './components/TeamModal'
import { AppActions } from './components/AppActions'
import { UserMenu } from './components/UserMenu'
import { useToast } from './components/Toast'
import { MANDATOS } from './data/constants'
import { uid, useBoard } from './store'
import type { Card, Mandato, Member } from './types'
import { dueStatus } from './utils'

type Filtro = 'TODOS' | Mandato

export function Workspace({ user, onLogout }: { user: Member; onLogout: () => void }) {
  const toast = useToast()
  const { state, dispatch, connected, reload } = useBoard(toast)
  const CURRENT_USER = user.id
  const [teamOpen, setTeamOpen] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('TODOS')
  const [query, setQuery] = useState('')
  const [people, setPeople] = useState<string[]>([])
  const searchRef = useRef<HTMLInputElement>(null)

  const doneIds = useMemo(() => new Set(state?.columns.find((c) => c.id === 'concluido')?.cardIds), [state?.columns])

  const visible = useCallback(
    (c: Card) => {
      if (filtro !== 'TODOS' && c.mandato !== filtro && c.mandato !== 'AMBOS') return false
      if (people.length && !c.memberIds.some((id) => people.includes(id))) return false
      const q = query.trim().toLowerCase()
      return !q || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    },
    [filtro, people, query],
  )

  const stats = useMemo(() => {
    const all = Object.values(state?.cards ?? {})
    const active = all.filter((c) => !doneIds.has(c.id))
    return {
      active: active.length,
      overdue: active.filter((c) => dueStatus(c.due, false) === 'overdue').length,
      today: active.filter((c) => dueStatus(c.due, false) === 'today').length,
      done: doneIds.size,
    }
  }, [state?.cards, doneIds])

  const quickAdd = (columnId: string, title: string) => {
    const card: Card = {
      id: uid(),
      title,
      description: '',
      mandato: filtro === 'TODOS' ? 'AMBOS' : filtro,
      formato: 'Post',
      prioridade: 'media',
      memberIds: [CURRENT_USER],
      checklist: [],
      comments: [],
      coverTheme: Math.floor(Math.random() * 6),
      createdAt: new Date().toISOString(),
    }
    dispatch({ type: 'add', columnId, card })
    return card.id
  }

  // Global shortcuts: "/" focuses search, "n" creates a card in Planejar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (!state || openId || teamOpen || el.closest('input, textarea, [contenteditable]')) return
      if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setOpenId(quickAdd('planejar', 'Nova pauta'))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Notifications link to /?card=<id>: open that card, on load or when the app is already open.
  useEffect(() => {
    const openFrom = (href: string) => {
      const id = new URL(href, location.origin).searchParams.get('card')
      if (id) setOpenId(id)
    }
    openFrom(location.href)
    if (location.search) history.replaceState(null, '', location.pathname)
    const onMsg = (e: MessageEvent) => e.data?.type === 'open' && openFrom(e.data.url)
    navigator.serviceWorker?.addEventListener('message', onMsg)
    return () => navigator.serviceWorker?.removeEventListener('message', onMsg)
  }, [])

  const close = useCallback(() => setOpenId(null), [])
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  if (!state) {
    return (
      <div className="aurora grid h-full place-items-center">
        <div className="flex items-center gap-3 text-[13px] text-zinc-500">
          <span className="size-4 animate-spin rounded-full border-2 border-white/10 border-t-emerald-300" /> Carregando quadro…
        </div>
      </div>
    )
  }
  const openCard = openId ? state.cards[openId] : null

  return (
    <div className="aurora grain flex h-full flex-col">
      {/* Top navigation */}
      <nav className="flex items-center gap-4 px-6 pt-5 sm:px-8">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="size-9 rounded-xl ring-1 ring-white/10" />
          <div className="leading-tight">
            <p className="text-[13px] font-semibold tracking-tight text-white">Estúdio Mídia</p>
            <p className="text-[11px] text-zinc-500">Julio Cezar · Aurelina Medeiros</p>
          </div>
        </div>

        <label className="ml-auto hidden h-10 w-full max-w-sm items-center gap-2.5 rounded-full bg-white/[0.04] px-4 ring-1 ring-white/[0.07] transition-colors focus-within:bg-white/[0.06] focus-within:ring-white/15 md:flex">
          <Search className="size-4 text-zinc-500" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && (setQuery(''), searchRef.current?.blur())}
            placeholder="Buscar pautas…"
            className="flex-1 bg-transparent text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
          />
          <kbd className="rounded-md bg-white/[0.06] px-1.5 py-0.5 font-sans text-[10px] text-zinc-500">/</kbd>
        </label>

        <button
          onClick={() => setOpenId(quickAdd('planejar', 'Nova pauta'))}
          className="ml-auto inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-semibold text-ink-950 shadow-[0_8px_30px_-8px_rgb(255_255_255/0.4)] transition-transform hover:scale-[1.02] active:scale-[0.98] md:ml-0"
        >
          <Plus className="size-4" /> Nova pauta
          <kbd className="hidden rounded bg-ink-950/10 px-1 text-[10px] sm:inline">N</kbd>
        </button>

        <AppActions onError={toast} />
        <span
          title={connected ? 'Sincronizado em tempo real' : 'Reconectando…'}
          className={clsx('size-2 shrink-0 rounded-full', connected ? 'bg-emerald-400 shadow-[0_0_10px] shadow-emerald-400/60' : 'animate-pulse bg-amber-400')}
        />
        <UserMenu user={user} onTeam={() => setTeamOpen(true)} onLogout={onLogout} onError={toast} />
      </nav>

      {/* Hero */}
      <header className="flex flex-wrap items-end gap-x-10 gap-y-5 px-6 pt-8 pb-6 sm:px-8">
        <div>
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-emerald-300/90">
            <Sparkles className="size-3.5" /> {greeting}, {user.name.split(' ')[0]}
          </p>
          <h1 className="mt-1 font-display text-5xl leading-none tracking-tight text-white sm:text-6xl">
            Quadro de <em className="bg-gradient-to-r from-emerald-300 to-sky-300 bg-clip-text text-transparent">produção</em>
          </h1>
        </div>

        <dl className="flex gap-2">
          <Stat label="Em andamento" value={stats.active} />
          <Stat label="Vencem hoje" value={stats.today} icon={<CalendarClock className="size-3.5" />} tone={stats.today ? 'amber' : undefined} />
          <Stat label="Atrasadas" value={stats.overdue} icon={<AlertTriangle className="size-3.5" />} tone={stats.overdue ? 'rose' : undefined} />
          <Stat label="Publicadas" value={stats.done} tone="emerald" />
        </dl>

        <div className="flex w-full flex-wrap items-center gap-3">
          <div className="flex rounded-full bg-white/[0.04] p-1 ring-1 ring-white/[0.07]">
            {(['TODOS', 'JC', 'AM'] as Filtro[]).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={clsx(
                  'flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors',
                  filtro === f ? 'bg-white/10 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]' : 'text-zinc-500 hover:text-zinc-200',
                )}
              >
                {f !== 'TODOS' && <span className={clsx('size-1.5 rounded-full', MANDATOS[f].dot)} />}
                {f === 'TODOS' ? 'Todos os mandatos' : MANDATOS[f].label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-full bg-white/[0.04] p-1 ring-1 ring-white/[0.07]">
            {state.members.map((m) => {
              const on = people.includes(m.id)
              return (
                <button
                  key={m.id}
                  onClick={() => setPeople(on ? people.filter((id) => id !== m.id) : [...people, m.id])}
                  aria-pressed={on}
                  aria-label={`Filtrar por ${m.name}`}
                  className={clsx('rounded-full transition-all', on ? 'ring-2 ring-white/70' : people.length ? 'opacity-40 hover:opacity-80' : '')}
                >
                  <Avatar member={m} size="md" className="ring-0" />
                </button>
              )
            })}
          </div>

          {(filtro !== 'TODOS' || people.length > 0 || query) && (
            <button
              onClick={() => (setFiltro('TODOS'), setPeople([]), setQuery(''))}
              className="text-[12.5px] text-zinc-500 underline-offset-4 hover:text-zinc-200 hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </header>

      <main className="min-h-0 flex-1">
        <Board state={state} dispatch={dispatch} visible={visible} onOpen={setOpenId} onQuickAdd={quickAdd} onCancel={reload} />
      </main>

      <AnimatePresence>
        {openCard && <CardModal key={openCard.id} card={openCard} state={state} currentUserId={CURRENT_USER} dispatch={dispatch} onClose={close} />}
      </AnimatePresence>
      <AnimatePresence>{teamOpen && <TeamModal user={user} members={state.members} onClose={() => setTeamOpen(false)} onError={toast} onChanged={reload} />}</AnimatePresence>
    </div>
  )
}

function Stat({ label, value, icon, tone }: { label: string; value: number; icon?: React.ReactNode; tone?: 'amber' | 'rose' | 'emerald' }) {
  return (
    <div className="min-w-[104px] rounded-2xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/[0.06]">
      <dt className="flex items-center gap-1.5 text-[11px] text-zinc-500">
        {icon}
        {label}
      </dt>
      <dd
        className={clsx(
          'mt-1 text-2xl font-semibold tracking-tight tabular-nums',
          tone === 'amber' && 'text-amber-200',
          tone === 'rose' && 'text-rose-300',
          tone === 'emerald' && 'text-emerald-300',
          !tone && 'text-white',
        )}
      >
        {value}
      </dd>
    </div>
  )
}
