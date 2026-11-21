import { AnimatePresence, motion } from 'motion/react'
import { KeyRound, LogOut, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { Member } from '../types'
import { Avatar } from './Avatar'

interface Props {
  user: Member
  onTeam: () => void
  onLogout: () => void
  onError: (msg: string) => void
}

export function UserMenu({ user, onTeam, onLogout, onError }: Props) {
  const [open, setOpen] = useState(false)
  const [pwd, setPwd] = useState<{ current: string; next: string } | null>(null)
  const [saved, setSaved] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && (setOpen(false), setPwd(null))
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (setOpen(false), setPwd(null))
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const savePwd = async () => {
    if (!pwd) return
    try {
      await api.changePassword(pwd.current, pwd.next)
      setPwd(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      onError((e as Error).message)
    }
  }

  const item = 'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white'
  const input = 'w-full rounded-lg bg-white/[0.04] px-3 py-2 text-[13px] text-zinc-100 ring-1 ring-white/[0.08] placeholder:text-zinc-600 focus:ring-white/20 focus:outline-none'

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-label="Menu da conta" aria-expanded={open} className="rounded-full transition-transform active:scale-95">
        <Avatar member={user} size="md" className="ring-white/10" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: 'top right' }}
            className="absolute top-12 right-0 z-40 w-64 rounded-2xl bg-ink-800/95 p-1.5 ring-1 ring-white/10 shadow-[0_20px_60px_-15px_rgb(0_0_0/0.8)] backdrop-blur-xl"
          >
            <div className="px-3 pt-2 pb-3">
              <p className="truncate text-[13px] font-medium text-white">{user.name}</p>
              <p className="truncate text-[11.5px] text-zinc-500">{user.email}</p>
            </div>
            <div className="h-px bg-white/[0.06]" />
            <div className="pt-1.5">
              <button className={item} onClick={() => (setOpen(false), onTeam())}>
                <Users className="size-4 text-zinc-500" /> Equipe
              </button>
              {pwd ? (
                <div className="space-y-2 p-2">
                  <input type="password" autoFocus placeholder="Senha atual" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} className={input} />
                  <input type="password" placeholder="Nova senha (6+)" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && savePwd()} className={input} />
                  <button onClick={savePwd} className="w-full rounded-lg bg-emerald-400 py-2 text-[12.5px] font-semibold text-ink-950 hover:bg-emerald-300">Salvar senha</button>
                </div>
              ) : (
                <button className={item} onClick={() => setPwd({ current: '', next: '' })}>
                  <KeyRound className="size-4 text-zinc-500" /> {saved ? 'Senha alterada ✓' : 'Trocar senha'}
                </button>
              )}
              <button className={item} onClick={onLogout}>
                <LogOut className="size-4 text-zinc-500" /> Sair
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
