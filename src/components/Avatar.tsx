import clsx from 'clsx'
import type { Member } from '../types'
import { initials } from '../utils'

export function Avatar({ member, size = 'sm', className }: { member: Member; size?: 'xs' | 'sm' | 'md'; className?: string }) {
  return (
    <span
      title={`${member.name} · ${member.role}`}
      className={clsx(
        'inline-grid shrink-0 place-items-center rounded-full font-semibold text-ink-950 ring-2 ring-ink-850 select-none',
        size === 'xs' && 'size-5 text-[9px]',
        size === 'sm' && 'size-6 text-[10px]',
        size === 'md' && 'size-8 text-xs',
        className,
      )}
      style={{ background: `linear-gradient(135deg, ${member.color}, color-mix(in oklab, ${member.color} 60%, white))` }}
    >
      {initials(member.name)}
    </span>
  )
}

export function AvatarStack({ members, max = 3, size = 'sm' }: { members: Member[]; max?: number; size?: 'xs' | 'sm' | 'md' }) {
  const shown = members.slice(0, max)
  const rest = members.length - shown.length
  return (
    <div className="flex -space-x-1.5">
      {shown.map((m) => (
        <Avatar key={m.id} member={m} size={size} />
      ))}
      {rest > 0 && (
        <span className="inline-grid size-6 place-items-center rounded-full bg-ink-700 text-[10px] font-medium text-zinc-300 ring-2 ring-ink-850">
          +{rest}
        </span>
      )}
    </div>
  )
}
