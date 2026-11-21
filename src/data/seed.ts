import type { BoardState, Card, Formato, Mandato, Member } from '../types'

export const MANDATOS: Record<Mandato, { label: string; short: string; tone: string; dot: string }> = {
  JC: { label: 'Vereador Julio Cezar', short: 'Julio Cezar', tone: 'text-sky-300 bg-sky-400/10 ring-sky-400/20', dot: 'bg-sky-400' },
  AM: { label: 'Deputada Aurelina Medeiros', short: 'Aurelina', tone: 'text-emerald-300 bg-emerald-400/10 ring-emerald-400/20', dot: 'bg-emerald-400' },
  AMBOS: { label: 'Ambos os mandatos', short: 'JC + AM', tone: 'text-amber-200 bg-amber-300/10 ring-amber-300/20', dot: 'bg-amber-300' },
}

export const FORMATOS: Formato[] = ['Post', 'Stories', 'Carrossel', 'Reels', 'Vídeo', 'Arte', 'Cobertura']

/** Gradient themes used as a cover when the card has no image. */
export const COVER_THEMES = [
  'from-emerald-500/80 via-teal-600/70 to-sky-700/80',
  'from-sky-500/80 via-indigo-600/70 to-violet-700/80',
  'from-rose-500/80 via-red-600/70 to-orange-600/80',
  'from-amber-400/80 via-orange-500/70 to-rose-600/80',
  'from-fuchsia-500/80 via-purple-600/70 to-indigo-700/80',
  'from-zinc-600/80 via-zinc-700/70 to-zinc-900/80',
]

const members: Member[] = [
  { id: 'm1', name: 'Caio Reis', role: 'Coordenação', color: '#34d399' },
  { id: 'm2', name: 'Eduarda Rocha', role: 'Design', color: '#60a5fa' },
  { id: 'm3', name: 'Sofia Santos', role: 'Social media', color: '#f472b6' },
  { id: 'm4', name: 'Lucas Melo', role: 'Audiovisual', color: '#fbbf24' },
]

const iso = (d: number) => {
  const date = new Date()
  date.setDate(date.getDate() + d)
  return date.toISOString().slice(0, 10)
}

let n = 0
const card = (p: Partial<Card> & Pick<Card, 'title' | 'mandato' | 'formato'>): Card => ({
  id: `c${++n}`,
  description: '',
  prioridade: 'media',
  memberIds: [],
  checklist: [],
  comments: [],
  coverTheme: n % COVER_THEMES.length,
  createdAt: new Date().toISOString(),
  ...p,
})

const cards = [
  card({ title: 'Dia Nacional do Doador de Sangue', mandato: 'AMBOS', formato: 'Carrossel', start: iso(-3), due: iso(0), memberIds: ['m2', 'm3'], coverTheme: 0, prioridade: 'alta',
    description: 'Carrossel de 6 lâminas com dados do Hemoam e chamada para doação.',
    checklist: [
      { id: 'k1', text: 'Roteiro das lâminas', done: true },
      { id: 'k2', text: 'Arte final', done: true },
      { id: 'k3', text: 'Legenda e hashtags', done: false },
    ] }),
  card({ title: 'Dia Internacional pela Eliminação da Violência contra a Mulher', mandato: 'AM', formato: 'Carrossel', due: iso(4), memberIds: ['m2'], coverTheme: 4,
    description: 'Proteger a mulher é trabalho de todos os dias.' }),
  card({ title: 'Dezembro Vermelho — HIV e aids não são a mesma coisa', mandato: 'AMBOS', formato: 'Carrossel', due: iso(10), memberIds: ['m3'], coverTheme: 2 }),
  card({ title: 'Cobertura da sessão ordinária', mandato: 'JC', formato: 'Cobertura', due: iso(2), memberIds: ['m4'], coverTheme: 1 }),
  card({ title: 'Stories — Dia Nacional de Combate ao Câncer Infantil', mandato: 'AMBOS', formato: 'Stories', start: iso(-3), due: iso(0), memberIds: ['m2', 'm1'], coverTheme: 3,
    comments: [{ id: 'cm1', authorId: 'm1', text: 'Ajustar o logo da ALEAM no rodapé.', createdAt: new Date().toISOString() }] }),
  card({ title: 'Aniversário — Sulivan Barros dos Santos', mandato: 'JC', formato: 'Post', due: iso(1), memberIds: ['m3'], coverTheme: 3 }),
  card({ title: 'Post/Stories — Dia da Consciência Negra', mandato: 'AMBOS', formato: 'Post', start: iso(-3), due: iso(-2), memberIds: ['m2'], coverTheme: 1 }),
  card({ title: '#TBT — Entrega da medalha na Assembleia', mandato: 'AM', formato: 'Post', due: iso(-5), memberIds: ['m3'], coverTheme: 0 }),
  card({ title: 'Reels — Bastidores do gabinete', mandato: 'JC', formato: 'Reels', due: iso(7), memberIds: ['m4', 'm1'], coverTheme: 5, prioridade: 'baixa' }),
]

const ids = cards.map((c) => c.id)

export const seed: BoardState = {
  members,
  cards: Object.fromEntries(cards.map((c) => [c.id, c])),
  columns: [
    { id: 'planejar', title: 'Planejar', hint: 'Pautas e ideias', accent: '#a78bfa', cardIds: [ids[8]] },
    { id: 'executar', title: 'Executar', hint: 'Em produção', accent: '#60a5fa', cardIds: [ids[0], ids[1], ids[2], ids[3]] },
    { id: 'aprovar', title: 'Aprovar', hint: 'Aguardando aprovação', accent: '#fbbf24', cardIds: [ids[4], ids[5]] },
    { id: 'finalizar', title: 'Finalizar', hint: 'Ajustes e agendamento', accent: '#f472b6', cardIds: [] },
    { id: 'concluido', title: 'Concluído', hint: 'Publicado', accent: '#34d399', cardIds: [ids[6], ids[7]] },
  ],
}
