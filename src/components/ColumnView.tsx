import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'motion/react'
import { Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Card, Column, Member } from '../types'
import { SortableCard } from './CardTile'

interface Props {
  column: Column
  cards: Card[]
  total: number
  members: Member[]
  onOpen: (id: string) => void
  onQuickAdd: (columnId: string, title: string) => void
}

export function ColumnView({ column, cards, total, members, onOpen, onQuickAdd }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: 'column' } })
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const done = column.id === 'concluido'

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  const submit = () => {
    const t = title.trim()
    if (t) onQuickAdd(column.id, t)
    setTitle('')
    inputRef.current?.focus()
  }

  return (
    <section
      className={clsx(
        'flex max-h-full w-[300px] shrink-0 flex-col rounded-3xl bg-ink-900/60 ring-1 ring-white/[0.05] backdrop-blur-xl transition-colors duration-200',
        isOver && 'bg-ink-850/80 ring-white/[0.1]',
      )}
    >
      <header className="flex items-center gap-2.5 px-4 pt-4 pb-3">
        <span className="size-2 rounded-full" style={{ background: column.accent, boxShadow: `0 0 12px ${column.accent}` }} />
        <div className="min-w-0 flex-1">
          <h2 className="text-[13px] font-semibold tracking-tight text-zinc-100">{column.title}</h2>
          <p className="truncate text-[11px] text-zinc-500">{column.hint}</p>
        </div>
        <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[11px] font-medium text-zinc-400 tabular-nums">
          {cards.length !== total ? `${cards.length}/${total}` : total}
        </span>
        <button
          onClick={() => setAdding(true)}
          aria-label={`Adicionar cartão em ${column.title}`}
          className="grid size-7 place-items-center rounded-full text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
        >
          <Plus className="size-4" />
        </button>
      </header>

      <div ref={setNodeRef} className="scroll-thin min-h-24 flex-1 space-y-2.5 overflow-y-auto px-2.5 pb-2.5">
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((c) => (
            <SortableCard key={c.id} card={c} members={members} done={done} onOpen={onOpen} />
          ))}
        </SortableContext>

        {cards.length === 0 && !adding && (
          <div className="grid h-24 place-items-center rounded-2xl border border-dashed border-white/[0.07] text-[12px] text-zinc-600">
            Arraste cartões para cá
          </div>
        )}

        <AnimatePresence initial={false}>
          {adding && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl bg-ink-800 p-2.5 ring-1 ring-white/10"
            >
              <textarea
                ref={inputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    submit()
                  }
                  if (e.key === 'Escape') setAdding(false)
                }}
                rows={2}
                placeholder="Título da pauta…"
                className="w-full resize-none bg-transparent text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              />
              <div className="mt-1 flex items-center gap-1.5">
                <button onClick={submit} className="rounded-lg bg-emerald-400 px-3 py-1.5 text-[12px] font-semibold text-ink-950 transition-colors hover:bg-emerald-300">
                  Adicionar
                </button>
                <button onClick={() => setAdding(false)} aria-label="Cancelar" className="grid size-7 place-items-center rounded-lg text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200">
                  <X className="size-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="mx-2.5 mb-2.5 flex items-center gap-2 rounded-2xl px-3 py-2.5 text-[12.5px] text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-zinc-200"
        >
          <Plus className="size-4" /> Adicionar cartão
        </button>
      )}
    </section>
  )
}
