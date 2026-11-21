export type Mandato = 'JC' | 'AM' | 'AMBOS'
export type Formato = 'Post' | 'Stories' | 'Carrossel' | 'Reels' | 'Vídeo' | 'Arte' | 'Cobertura'
export type Prioridade = 'baixa' | 'media' | 'alta'

export interface Member {
  id: string
  name: string
  role: string
  color: string
  email?: string
  isAdmin?: boolean
}

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface Comment {
  id: string
  authorId: string
  text: string
  createdAt: string
}

export interface Card {
  id: string
  title: string
  description: string
  mandato: Mandato
  formato: Formato
  prioridade: Prioridade
  start?: string
  due?: string
  memberIds: string[]
  checklist: ChecklistItem[]
  comments: Comment[]
  cover?: string
  coverTheme: number
  createdAt: string
}

export interface Column {
  id: string
  title: string
  hint: string
  accent: string
  cardIds: string[]
}

export interface BoardState {
  columns: Column[]
  cards: Record<string, Card>
  members: Member[]
}
