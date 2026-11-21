import clsx from 'clsx'
import { motion } from 'motion/react'
import { ShieldCheck, Trash2, UserPlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Member } from '../types'
import { Avatar } from './Avatar'

interface Props {
  user: Member
  members: Member[]
  onClose: () => void
  onError: (msg: string) => void
  onChanged: () => void
}

const empty = { name: '', email: '', role: '', password: '', isAdmin: false }

export function TeamModal({ user, members, onClose, onError, onChanged }: Props) {
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.addUser(form)
      setForm(empty)
      onChanged()
    } catch (err) {
      onError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    try {
      await api.removeUser(id)
      setConfirm(null)
      onChanged()
    } catch (err) {
      onError((err as Error).message)
    }
  }

  const input = 'w-full rounded-xl bg-white/[0.04] px-3.5 py-2.5 text-[13px] text-zinc-100 ring-1 ring-white/[0.08] placeholder:text-zinc-600 focus:bg-white/[0.06] focus:ring-white/20 focus:outline-none'

  return (
    <motion.div
      className="scroll-thin fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Equipe"
        className="w-full max-w-xl rounded-[28px] bg-ink-900 p-6 ring-1 ring-white/10 shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9)] sm:p-8"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-4xl leading-none text-white">Equipe</h2>
            <p className="mt-2 text-[13px] text-zinc-500">{members.length} pessoas com acesso ao quadro</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="grid size-9 place-items-center rounded-full text-zinc-400 hover:bg-white/[0.06] hover:text-white">
            <X className="size-4" />
          </button>
        </div>

        <ul className="mt-6 space-y-1">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-white/[0.03]">
              <Avatar member={m} size="md" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-[13.5px] text-zinc-100">
                  {m.name}
                  {m.isAdmin && <ShieldCheck className="size-3.5 text-emerald-300" aria-label="Administrador" />}
                  {m.id === user.id && <span className="text-[11px] text-zinc-500">(você)</span>}
                </p>
                <p className="truncate text-[12px] text-zinc-500">{[m.role, m.email].filter(Boolean).join(' · ')}</p>
              </div>
              {user.isAdmin && m.id !== user.id && (
                confirm === m.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => remove(m.id)} className="rounded-lg bg-rose-500 px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-rose-400">Remover</button>
                    <button onClick={() => setConfirm(null)} className="rounded-lg px-2.5 py-1 text-[12px] text-zinc-400 hover:bg-white/[0.05]">Cancelar</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirm(m.id)} aria-label={`Remover ${m.name}`} className="grid size-8 place-items-center rounded-lg text-zinc-600 hover:bg-rose-500/10 hover:text-rose-300">
                    <Trash2 className="size-4" />
                  </button>
                )
              )}
            </li>
          ))}
        </ul>

        {user.isAdmin ? (
          <form onSubmit={add} className="mt-6 space-y-3 rounded-3xl bg-white/[0.02] p-4 ring-1 ring-white/[0.06]">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-zinc-200">
              <UserPlus className="size-4 text-zinc-500" /> Adicionar pessoa
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input required placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
              <input placeholder="Função (ex.: Design)" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={input} />
              <input required type="email" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} />
              <input required type="text" minLength={6} placeholder="Senha inicial (6+)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={input} autoComplete="off" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-[12.5px] text-zinc-400">
                <input type="checkbox" checked={form.isAdmin} onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })} className="accent-emerald-400" />
                Administrador (pode gerenciar a equipe)
              </label>
              <button disabled={busy} className={clsx('rounded-xl bg-emerald-400 px-4 py-2 text-[12.5px] font-semibold text-ink-950 transition-opacity hover:bg-emerald-300', busy && 'opacity-50')}>
                Adicionar
              </button>
            </div>
          </form>
        ) : (
          <p className="mt-6 text-[12.5px] text-zinc-500">Só administradores podem adicionar ou remover pessoas.</p>
        )}
      </motion.div>
    </motion.div>
  )
}
