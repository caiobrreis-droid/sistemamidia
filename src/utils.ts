const fmt = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' })

export function formatDate(iso?: string) {
  if (!iso) return ''
  return fmt.format(new Date(iso + 'T12:00:00')).replace('.', '')
}

export function formatRange(start?: string, due?: string) {
  if (start && due) return `${formatDate(start)} – ${formatDate(due)}`
  return formatDate(due || start)
}

export type DueStatus = 'done' | 'overdue' | 'today' | 'soon' | 'later' | 'none'

export function dueStatus(due: string | undefined, done: boolean): DueStatus {
  if (!due) return 'none'
  if (done) return 'done'
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const diff = Math.round((new Date(due + 'T12:00:00').getTime() - today.getTime()) / 86400000)
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  if (diff <= 2) return 'soon'
  return 'later'
}

export const DUE_STYLES: Record<DueStatus, string> = {
  done: 'text-emerald-300 bg-emerald-400/10 ring-emerald-400/20',
  overdue: 'text-rose-300 bg-rose-500/10 ring-rose-500/25',
  today: 'text-amber-200 bg-amber-400/10 ring-amber-400/25',
  soon: 'text-amber-100/90 bg-white/[0.04] ring-white/10',
  later: 'text-zinc-400 bg-white/[0.03] ring-white/[0.08]',
  none: '',
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export function timeAgo(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'agora'
  if (s < 3600) return `há ${Math.floor(s / 60)} min`
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`
  return `há ${Math.floor(s / 86400)} d`
}
