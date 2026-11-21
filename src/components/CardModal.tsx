import clsx from 'clsx'
import { motion } from 'motion/react'
import { CalendarDays, Check, ImagePlus, Layers, ListChecks, MessageCircle, Plus, Send, Trash2, Users, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { BoardState, Card, Mandato, Prioridade } from '../types'
import { COVER_THEMES, FORMATOS, MANDATOS } from '../data/constants'
import { findColumnOf, uid, type Action } from '../store'
import { timeAgo } from '../utils'
import { Avatar } from './Avatar'

interface Props {
  card: Card
  state: BoardState
  currentUserId: string
  dispatch: (a: Action) => void
  onClose: () => void
}

const PRIORIDADES: { id: Prioridade; label: string }[] = [
  { id: 'baixa', label: 'Baixa' },
  { id: 'media', label: 'Média' },
  { id: 'alta', label: 'Urgente' },
]

export function CardModal({ card, state, currentUserId, dispatch, onClose }: Props) {
  const patch = (p: Partial<Card>) => dispatch({ type: 'update', card: { ...card, ...p } })
  const column = findColumnOf(state, card.id)
  const [newItem, setNewItem] = useState('')
  const [comment, setComment] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const checked = card.checklist.filter((i) => i.done).length
  const progress = card.checklist.length ? Math.round((checked / card.checklist.length) * 100) : 0

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const onCover = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => patch({ cover: String(reader.result) })
    reader.readAsDataURL(file)
  }

  const addItem = () => {
    const t = newItem.trim()
    if (!t) return
    patch({ checklist: [...card.checklist, { id: uid(), text: t, done: false }] })
    setNewItem('')
  }

  const addComment = () => {
    const t = comment.trim()
    if (!t) return
    patch({ comments: [...card.comments, { id: uid(), authorId: currentUserId, text: t, createdAt: new Date().toISOString() }] })
    setComment('')
  }

  return (
    <motion.div
      className="scroll-thin fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/60 backdrop-blur-sm sm:p-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={card.title}
        className="relative min-h-full w-full max-w-4xl overflow-hidden bg-ink-900 sm:min-h-0 sm:rounded-[28px] sm:ring-1 sm:ring-white/10 shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9)]"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Cover */}
        <div className="group relative h-[calc(env(safe-area-inset-top)+150px)] sm:h-52">
          {card.cover ? (
            <img src={card.cover} alt="" className="size-full object-cover" />
          ) : (
            <div className={clsx('size-full bg-gradient-to-br', COVER_THEMES[card.coverTheme % COVER_THEMES.length])}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgb(255_255_255/0.3),transparent_55%)]" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/20 to-transparent" />
          <div className="absolute top-[calc(env(safe-area-inset-top)+12px)] right-4 left-4 flex items-center justify-between gap-2 sm:left-auto sm:justify-end">
            <div className="flex items-center gap-1 rounded-full bg-black/40 p-1 backdrop-blur-md">
              {COVER_THEMES.map((t, i) => (
                <button
                  key={t}
                  aria-label={`Capa ${i + 1}`}
                  onClick={() => patch({ coverTheme: i, cover: undefined })}
                  className={clsx('size-5 rounded-full bg-gradient-to-br ring-2 transition-transform hover:scale-110', t, !card.cover && card.coverTheme === i ? 'ring-white' : 'ring-transparent')}
                />
              ))}
              <button onClick={() => fileRef.current?.click()} aria-label="Enviar imagem de capa" className="grid size-6 place-items-center rounded-full text-white/80 hover:bg-white/10">
                <ImagePlus className="size-3.5" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onCover(e.target.files?.[0])} />
            </div>
            <button onClick={onClose} aria-label="Fechar" className="grid size-9 place-items-center rounded-full bg-black/40 text-white/80 backdrop-blur-md transition-colors hover:bg-black/60 hover:text-white">
              <X className="size-4" />
            </button>
          </div>
          <div className="absolute right-5 bottom-3 left-5 sm:right-8 sm:left-8">
            <p className="text-[11px] font-medium tracking-[0.14em] text-white/60 uppercase">
              em <span className="text-white/90">{column?.title}</span> · {card.formato}
            </p>
          </div>
        </div>

        <div className="px-5 pt-1 sm:px-8">
          <textarea
            value={card.title}
            onChange={(e) => patch({ title: e.target.value.replace(/\n/g, ' ') })}
            rows={1}
            className="w-full resize-none overflow-hidden [field-sizing:content] bg-transparent font-display text-[30px] sm:text-[34px] leading-[1.1] text-white placeholder:text-zinc-600 focus:outline-none"
            placeholder="Título"
          />
        </div>

        <div className="grid gap-8 px-5 pt-6 pb-[calc(env(safe-area-inset-bottom)+32px)] sm:px-8 sm:pb-8 md:grid-cols-[1fr_260px]">
          {/* Main */}
          <div className="min-w-0 space-y-8">


            <Section icon={<Layers className="size-4" />} title="Briefing">
              <textarea
                value={card.description}
                onChange={(e) => patch({ description: e.target.value })}
                rows={4}
                placeholder="Objetivo da peça, referências, texto de apoio, links…"
                className="w-full resize-y rounded-2xl bg-white/[0.03] p-4 text-[13.5px] leading-relaxed text-zinc-200 ring-1 ring-white/[0.06] placeholder:text-zinc-600 focus:bg-white/[0.05] focus:ring-white/15 focus:outline-none"
              />
            </Section>

            <Section
              icon={<ListChecks className="size-4" />}
              title="Checklist"
              aside={card.checklist.length > 0 && <span className="text-[12px] text-zinc-500 tabular-nums">{progress}%</span>}
            >
              {card.checklist.length > 0 && (
                <div className="mb-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400" animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} />
                </div>
              )}
              <ul className="space-y-1">
                {card.checklist.map((item) => (
                  <li key={item.id} className="group flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-white/[0.03]">
                    <button
                      onClick={() => patch({ checklist: card.checklist.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)) })}
                      aria-label={item.done ? 'Desmarcar' : 'Marcar como feito'}
                      className={clsx('grid size-[18px] shrink-0 place-items-center rounded-md ring-1 transition-colors', item.done ? 'bg-emerald-400 ring-emerald-400 text-ink-950' : 'ring-white/20 hover:ring-white/40')}
                    >
                      {item.done && <Check className="size-3" strokeWidth={3} />}
                    </button>
                    <span className={clsx('flex-1 text-[13.5px] transition-colors', item.done ? 'text-zinc-500 line-through' : 'text-zinc-200')}>{item.text}</span>
                    <button
                      onClick={() => patch({ checklist: card.checklist.filter((i) => i.id !== item.id) })}
                      aria-label="Remover item"
                      className="text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-300"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex items-center gap-2 rounded-xl px-2 py-1.5">
                <Plus className="size-4 text-zinc-600" />
                <input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addItem()}
                  placeholder="Adicionar item"
                  className="flex-1 bg-transparent text-[13.5px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
                />
              </div>
            </Section>

            <Section icon={<MessageCircle className="size-4" />} title="Conversa">
              <div className="space-y-4">
                {card.comments.map((c) => {
                  const author = state.members.find((m) => m.id === c.authorId)
                  return (
                    <div key={c.id} className="flex gap-3">
                      {author && <Avatar member={author} size="md" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] text-zinc-500">
                          <span className="font-medium text-zinc-300">{author?.name ?? 'Alguém'}</span> · {timeAgo(c.createdAt)}
                        </p>
                        <p className="mt-1 rounded-2xl rounded-tl-md bg-white/[0.04] px-3.5 py-2.5 text-[13.5px] text-zinc-200">{c.text}</p>
                      </div>
                    </div>
                  )
                })}
                <div className="flex items-center gap-2 rounded-2xl bg-white/[0.03] p-1.5 pl-4 ring-1 ring-white/[0.06] focus-within:ring-white/15">
                  <input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addComment()}
                    placeholder="Escreva um comentário ou pedido de ajuste…"
                    className="flex-1 bg-transparent text-[13.5px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
                  />
                  <button onClick={addComment} disabled={!comment.trim()} aria-label="Enviar comentário" className="grid size-8 place-items-center rounded-xl bg-emerald-400 text-ink-950 transition-opacity disabled:opacity-30">
                    <Send className="size-3.5" />
                  </button>
                </div>
              </div>
            </Section>
          </div>

          {/* Sidebar */}
          <aside className="order-first space-y-6 rounded-3xl bg-white/[0.02] p-4 ring-1 ring-white/[0.05] md:order-none md:rounded-none md:bg-transparent md:p-0 md:pt-2 md:ring-0">
            <Field label="Etapa">
              <div className="grid grid-cols-2 gap-1 md:grid-cols-1">
                {state.columns.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => col.id !== column?.id && dispatch({ type: 'move', cardId: card.id, toColumn: col.id, toIndex: 0 })}
                    className={clsx(
                      'flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] transition-colors',
                      col.id === column?.id ? 'bg-white/[0.07] text-white' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200',
                    )}
                  >
                    <span className="size-2 rounded-full" style={{ background: col.accent }} />
                    {col.title}
                    {col.id === column?.id && <Check className="ml-auto size-3.5" />}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Mandato">
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-white/[0.03] p-1 ring-1 ring-white/[0.06]">
                {(Object.keys(MANDATOS) as Mandato[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => patch({ mandato: k })}
                    className={clsx('rounded-lg py-1.5 text-[12px] font-medium transition-colors', card.mandato === k ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-200')}
                  >
                    {k === 'AMBOS' ? 'Ambos' : k}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Formato">
              <div className="flex flex-wrap gap-1.5">
                {FORMATOS.map((f) => (
                  <Chip key={f} active={card.formato === f} onClick={() => patch({ formato: f })}>
                    {f}
                  </Chip>
                ))}
              </div>
            </Field>

            <Field label="Prioridade">
              <div className="flex gap-1.5">
                {PRIORIDADES.map((p) => (
                  <Chip key={p.id} active={card.prioridade === p.id} onClick={() => patch({ prioridade: p.id })} danger={p.id === 'alta'}>
                    {p.label}
                  </Chip>
                ))}
              </div>
            </Field>

            <Field label="Datas" icon={<CalendarDays className="size-3.5" />}>
              <div className="grid grid-cols-2 gap-2">
                <DateInput label="Início" value={card.start} onChange={(v) => patch({ start: v })} />
                <DateInput label="Entrega" value={card.due} onChange={(v) => patch({ due: v })} />
              </div>
            </Field>

            <Field label="Responsáveis" icon={<Users className="size-3.5" />}>
              <div className="grid grid-cols-2 gap-1 md:grid-cols-1">
                {state.members.map((m) => {
                  const on = card.memberIds.includes(m.id)
                  return (
                    <button
                      key={m.id}
                      onClick={() => patch({ memberIds: on ? card.memberIds.filter((id) => id !== m.id) : [...card.memberIds, m.id] })}
                      className={clsx('flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors', on ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]')}
                    >
                      <Avatar member={m} size="sm" className={clsx(!on && 'opacity-50 grayscale')} />
                      <span className="min-w-0 flex-1">
                        <span className={clsx('block truncate text-[13px]', on ? 'text-white' : 'text-zinc-400')}>{m.name}</span>
                        <span className="block text-[11px] text-zinc-600">{m.role}</span>
                      </span>
                      {on && <Check className="size-3.5 text-emerald-400" />}
                    </button>
                  )
                })}
              </div>
            </Field>

            <div className="border-t border-white/[0.06] pt-4">
              {confirmDelete ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      dispatch({ type: 'remove', cardId: card.id })
                      onClose()
                    }}
                    className="flex-1 rounded-xl bg-rose-500 py-2 text-[12.5px] font-semibold text-white hover:bg-rose-400"
                  >
                    Excluir de vez
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="rounded-xl px-3 py-2 text-[12.5px] text-zinc-400 hover:bg-white/[0.05]">
                    Cancelar
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[12.5px] text-zinc-500 transition-colors hover:bg-rose-500/10 hover:text-rose-300">
                  <Trash2 className="size-3.5" /> Excluir cartão
                </button>
              )}
            </div>
          </aside>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Section({ icon, title, aside, children }: { icon: ReactNode; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 text-zinc-400">
        {icon}
        <h3 className="text-[13px] font-semibold text-zinc-200">{title}</h3>
        <span className="ml-auto">{aside}</span>
      </div>
      {children}
    </section>
  )
}

function Field({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium tracking-[0.12em] text-zinc-500 uppercase">
        {icon}
        {label}
      </p>
      {children}
    </div>
  )
}

function Chip({ active, danger, onClick, children }: { active: boolean; danger?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'rounded-full px-2.5 py-1 text-[12px] font-medium ring-1 ring-inset transition-colors',
        active ? (danger ? 'bg-rose-500/15 text-rose-200 ring-rose-400/30' : 'bg-white/10 text-white ring-white/20') : 'text-zinc-500 ring-white/[0.08] hover:text-zinc-200 hover:ring-white/15',
      )}
    >
      {children}
    </button>
  )
}

function DateInput({ label, value, onChange }: { label: string; value?: string; onChange: (v?: string) => void }) {
  return (
    <label className="block rounded-xl bg-white/[0.03] px-3 py-2 ring-1 ring-white/[0.06] focus-within:ring-white/15">
      <span className="block text-[10.5px] text-zinc-500">{label}</span>
      <input
        type="date"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="w-full bg-transparent text-[12.5px] text-zinc-200 [color-scheme:dark] focus:outline-none"
      />
    </label>
  )
}
