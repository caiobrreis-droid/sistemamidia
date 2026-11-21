import { useEffect, useReducer } from 'react'
import type { BoardState, Card } from './types'
import { seed } from './data/seed'

const KEY = 'sistemamidia:board:v1'

export const uid = () => Math.random().toString(36).slice(2, 10)

export type Action =
  | { type: 'move'; cardId: string; toColumn: string; toIndex: number }
  | { type: 'add'; columnId: string; card: Card }
  | { type: 'update'; card: Card }
  | { type: 'remove'; cardId: string }
  | { type: 'reset' }

export function findColumnOf(state: BoardState, cardId: string) {
  return state.columns.find((c) => c.cardIds.includes(cardId))
}

function reducer(state: BoardState, action: Action): BoardState {
  switch (action.type) {
    case 'move': {
      const columns = state.columns.map((c) => ({ ...c, cardIds: c.cardIds.filter((id) => id !== action.cardId) }))
      const target = columns.find((c) => c.id === action.toColumn)
      if (!target) return state
      target.cardIds.splice(Math.max(0, Math.min(action.toIndex, target.cardIds.length)), 0, action.cardId)
      return { ...state, columns }
    }
    case 'add':
      return {
        ...state,
        cards: { ...state.cards, [action.card.id]: action.card },
        columns: state.columns.map((c) => (c.id === action.columnId ? { ...c, cardIds: [...c.cardIds, action.card.id] } : c)),
      }
    case 'update':
      return { ...state, cards: { ...state.cards, [action.card.id]: action.card } }
    case 'remove': {
      const cards = { ...state.cards }
      delete cards[action.cardId]
      return { ...state, cards, columns: state.columns.map((c) => ({ ...c, cardIds: c.cardIds.filter((id) => id !== action.cardId) })) }
    }
    case 'reset':
      return seed
  }
}

function load(): BoardState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as BoardState
  } catch {
    /* corrupted or unavailable storage: fall back to seed */
  }
  return seed
}

/** Board state persisted to localStorage. Swap this hook for an API-backed one when the backend lands. */
export function useBoard() {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* quota exceeded (large cover images) — keep working in memory */
    }
  }, [state])
  return [state, dispatch] as const
}
