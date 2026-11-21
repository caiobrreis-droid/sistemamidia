import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { BoardState, Card } from './types'
import { api, CLIENT_ID } from './api'

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export type Action =
  /** `local: true` only updates the screen (used while dragging); the final drop is persisted. */
  | { type: 'move'; cardId: string; toColumn: string; toIndex: number; local?: boolean }
  | { type: 'add'; columnId: string; card: Card }
  | { type: 'update'; card: Card }
  | { type: 'remove'; cardId: string }

type Internal = Action | { type: 'load'; state: BoardState }

export function findColumnOf(state: BoardState, cardId: string) {
  return state.columns.find((c) => c.cardIds.includes(cardId))
}

function reducer(state: BoardState | null, action: Internal): BoardState | null {
  if (action.type === 'load') return action.state
  if (!state) return state
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
  }
}

/**
 * Board state kept in sync with the server: changes apply on screen immediately and are sent to the API;
 * other people's changes arrive via server-sent events and trigger a refetch.
 */
export function useBoard(onError: (msg: string) => void) {
  const [state, raw] = useReducer(reducer, null)
  const [connected, setConnected] = useState(true)
  const pending = useRef(new Map<string, { card: Card; timer: number }>())
  const errorRef = useRef(onError)
  errorRef.current = onError

  const reload = useCallback(async () => {
    try {
      const fresh = await api.board()
      // Keep local edits that are still waiting to be saved.
      for (const [id, p] of pending.current) if (fresh.cards[id]) fresh.cards[id] = p.card
      raw({ type: 'load', state: fresh })
    } catch (e) {
      errorRef.current((e as Error).message)
    }
  }, [])

  const fail = useCallback(
    (e: unknown) => {
      errorRef.current((e as Error).message || 'Não foi possível salvar')
      reload()
    },
    [reload],
  )

  const flush = useCallback(
    (id: string) => {
      const p = pending.current.get(id)
      if (!p) return
      clearTimeout(p.timer)
      pending.current.delete(id)
      api.updateCard(p.card).catch(fail)
    },
    [fail],
  )

  const dispatch = useCallback(
    (a: Action) => {
      raw(a)
      switch (a.type) {
        case 'move':
          if (!a.local) api.moveCard(a.cardId, a.toColumn, a.toIndex).catch(fail)
          break
        case 'add':
          api.addCard(a.columnId, a.card).catch(fail)
          break
        case 'update': {
          // Debounce typing so we don't send a request per keystroke.
          const prev = pending.current.get(a.card.id)
          if (prev) clearTimeout(prev.timer)
          const timer = window.setTimeout(() => flush(a.card.id), 500)
          pending.current.set(a.card.id, { card: a.card, timer })
          break
        }
        case 'remove': {
          const p = pending.current.get(a.cardId)
          if (p) clearTimeout(p.timer)
          pending.current.delete(a.cardId)
          api.removeCard(a.cardId).catch(fail)
          break
        }
      }
    },
    [fail, flush],
  )

  useEffect(() => {
    reload()
    let timer: number | undefined
    const es = new EventSource('/api/events')
    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)
    es.onmessage = (ev) => {
      const msg = JSON.parse(ev.data) as { by?: string }
      if (msg.by === CLIENT_ID) return
      clearTimeout(timer)
      timer = window.setTimeout(reload, 150)
    }
    // Save anything pending before the tab closes.
    const beforeUnload = () => {
      for (const id of [...pending.current.keys()]) flush(id)
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => {
      es.close()
      clearTimeout(timer)
      window.removeEventListener('beforeunload', beforeUnload)
    }
  }, [reload, flush])

  return { state, dispatch, connected, reload }
}
