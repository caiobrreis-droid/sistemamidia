import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import clsx from 'clsx'
import { AlignLeft, CheckSquare, Clock, Flame, MessageCircle } from 'lucide-react'
import type { Card, Member } from '../types'
import { COVER_THEMES, MANDATOS } from '../data/constants'
import { DUE_STYLES, dueStatus, formatRange } from '../utils'
import { AvatarStack } from './Avatar'

interface Props {
  card: Card
  members: Member[]
  done: boolean
  onOpen: (id: string) => void
}

export function SortableCard(props: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.card.id, data: { type: 'card' } })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={clsx('outline-none', isDragging && 'opacity-30')}
    >
      <CardTile {...props} />
    </div>
  )
}

export function CardTile({ card, members, done, onOpen, overlay }: Props & { overlay?: boolean }) {
  const m = MANDATOS[card.mandato]
  const status = dueStatus(card.due, done)
  const checked = card.checklist.filter((i) => i.done).length
  const assignees = members.filter((mb) => card.memberIds.includes(mb.id))

  return (
    <article
      onClick={() => onOpen(card.id)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(card.id)}
      tabIndex={0}
      className={clsx(
        'group relative cursor-pointer overflow-hidden rounded-2xl bg-ink-800/90 ring-1 ring-white/[0.06] transition-[box-shadow,transform,background-color] duration-200 ease-out-quint',
        'hover:bg-ink-700/80 hover:ring-white/[0.12] focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:outline-none',
        'shadow-[0_1px_0_0_rgb(255_255_255/0.04)_inset,0_8px_24px_-12px_rgb(0_0_0/0.6)]',
        overlay && 'rotate-[2deg] scale-[1.03] cursor-grabbing shadow-[0_30px_60px_-20px_rgb(0_0_0/0.8)] ring-white/20',
      )}
    >
      {/* Cover */}
      <div className="relative h-24 overflow-hidden">
        {card.cover ? (
          <img src={card.cover} alt="" className="size-full object-cover transition-transform duration-500 ease-out-quint group-hover:scale-[1.04]" draggable={false} />
        ) : (
          <div className={clsx('size-full bg-gradient-to-br', COVER_THEMES[card.coverTheme % COVER_THEMES.length])}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgb(255_255_255/0.25),transparent_50%)]" />
            <span className="absolute bottom-2 left-3 font-display text-2xl italic leading-none text-white/90 drop-shadow">{card.formato}</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-ink-800/90 to-transparent" />
        {card.prioridade === 'alta' && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-rose-200 backdrop-blur-md">
            <Flame className="size-3" /> Urgente
          </span>
        )}
      </div>

      <div className="space-y-3 p-3.5 pt-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-medium ring-1 ring-inset', m.tone)}>
            <span className={clsx('size-1.5 rounded-full', m.dot)} />
            {m.short}
          </span>
          {card.cover && (
            <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10.5px] font-medium text-zinc-400 ring-1 ring-inset ring-white/[0.08]">{card.formato}</span>
          )}
        </div>

        <h3 className="text-[13.5px] leading-snug font-medium text-zinc-100 text-pretty">{card.title}</h3>

        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
            {status !== 'none' && (
              <span className={clsx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium tabular-nums ring-1 ring-inset', DUE_STYLES[status])}>
                <Clock className="size-3" />
                {formatRange(card.start, card.due)}
              </span>
            )}
            {card.description && <AlignLeft className="size-3.5" aria-label="Tem descrição" />}
            {card.comments.length > 0 && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <MessageCircle className="size-3.5" />
                {card.comments.length}
              </span>
            )}
            {card.checklist.length > 0 && (
              <span className={clsx('inline-flex items-center gap-1 tabular-nums', checked === card.checklist.length && 'text-emerald-400')}>
                <CheckSquare className="size-3.5" />
                {checked}/{card.checklist.length}
              </span>
            )}
          </div>
          <AvatarStack members={assignees} size="xs" />
        </div>
      </div>
    </article>
  )
}
