import type { BoardState, Card, Member } from './types'

/** Identifies this browser tab so we can ignore our own realtime echoes. */
export const CLIENT_ID = Math.random().toString(36).slice(2)

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Client-Id': CLIENT_ID },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.error || 'Falha na comunicação com o servidor')
  return data as T
}

export const api = {
  me: () => req<{ user: Member }>('GET', '/api/me'),
  login: (email: string, password: string) => req<{ user: Member }>('POST', '/api/login', { email, password }),
  logout: () => req('POST', '/api/logout'),
  board: () => req<BoardState>('GET', '/api/board'),
  addCard: (columnId: string, card: Card) => req('POST', '/api/cards', { columnId, card }),
  updateCard: (card: Card) => req('PUT', `/api/cards/${card.id}`, { card }),
  moveCard: (id: string, toColumn: string, toIndex: number) => req('POST', `/api/cards/${id}/move`, { toColumn, toIndex }),
  removeCard: (id: string) => req('DELETE', `/api/cards/${id}`),
  addUser: (u: { name: string; email: string; password: string; role: string; isAdmin: boolean }) => req<{ user: Member }>('POST', '/api/users', u),
  removeUser: (id: string) => req('DELETE', `/api/users/${id}`),
  changePassword: (current: string, next: string) => req('PUT', '/api/me/password', { current, next }),
}
