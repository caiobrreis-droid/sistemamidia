import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
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
}

export function Board({ state, dispatch, visible, onOpen, onQuickAdd }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
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
    dispatch({ type: 'move', cardId: String(active.id), toColumn: to.columnId, toIndex: to.index })
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null)
    if (!over || active.id === over.id) return
    const to = target(String(over.id))
    if (to) dispatch({ type: 'move', cardId: String(active.id), toColumn: to.columnId, toIndex: to.index })
  }

  const active = activeId ? state.cards[activeId] : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="scroll-thin flex h-full items-start gap-4 overflow-x-auto px-6 pb-6 sm:px-8">
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
