import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import clsx from 'clsx'
import { useState } from 'react'
import type { BoardState, Card } from '../types'
import { findColumnOf, type Action } from '../store'
import { ColumnView } from './ColumnView'
import { CardTile } from './CardTile'

interface Props {
  state: BoardState
  dispatch: (a: Action) => void
  visible: (card: Card) => boolean
  onOpen: (id: string) => void
  onQuickAdd: (columnId: string, title: string) => void
  /** Called when a drag is cancelled, to restore the server's order. */
  onCancel: () => void
}

export function Board({ state, dispatch, visible, onOpen, onQuickAdd, onCancel }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // On touch screens a swipe scrolls; press and hold a card to pick it up.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  /** Resolve the drop target (a card or a column) to a column id + index in the full, unfiltered list. */
  const target = (overId: string) => {
    const col = state.columns.find((c) => c.id === overId)
    if (col) return { columnId: col.id, index: col.cardIds.length }
    const owner = findColumnOf(state, overId)
    if (!owner) return null
    return { columnId: owner.id, index: owner.cardIds.indexOf(overId) }
  }

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))

  // Move across columns while hovering so the destination column opens up live.
  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return
    const from = findColumnOf(state, String(active.id))
    const to = target(String(over.id))
    if (!from || !to || from.id === to.columnId) return
    dispatch({ type: 'move', cardId: String(active.id), toColumn: to.columnId, toIndex: to.index, local: true })
  }

  // Persist the final position (the card may already have changed column during onDragOver).
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null)
    const cardId = String(active.id)
    const to = over && over.id !== active.id ? target(String(over.id)) : null
    const current = findColumnOf(state, cardId)
    if (to) dispatch({ type: 'move', cardId, toColumn: to.columnId, toIndex: to.index })
    else if (current) dispatch({ type: 'move', cardId, toColumn: current.id, toIndex: current.cardIds.indexOf(cardId) })
  }

  const active = activeId ? state.cards[activeId] : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null)
        onCancel()
      }}
    >
      <div
        className={clsx(
          'scroll-thin flex h-full items-start gap-3 overflow-x-auto overscroll-x-contain px-4 pb-[calc(env(safe-area-inset-bottom)+96px)] sm:gap-4 sm:px-8 sm:pb-6',
          // Phones: one column at a time, snapping into place (off while dragging so auto-scroll works).
          !activeId && 'snap-x snap-mandatory scroll-px-4 sm:snap-none',
        )}
      >
        {state.columns.map((col) => {
          const cards = col.cardIds.map((id) => state.cards[id]).filter((c): c is Card => !!c)
          return (
            <ColumnView
              key={col.id}
              column={col}
              cards={cards.filter(visible)}
              total={cards.length}
              members={state.members}
              onOpen={onOpen}
              onQuickAdd={onQuickAdd}
            />
          )
        })}
        <div className="w-2 shrink-0" />
      </div>

      <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
        {active && <CardTile card={active} members={state.members} done={false} onOpen={() => {}} overlay />}
      </DragOverlay>
    </DndContext>
  )
}
