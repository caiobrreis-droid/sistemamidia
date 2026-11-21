import clsx from 'clsx'
import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { api } from './api'
import type { Member } from './types'

export function Login({ onLogin }: { onLogin: (u: Member) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { user } = await api.login(email, password)
      onLogin(user)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const input =
    'w-full rounded-2xl bg-white/[0.04] px-4 py-3.5 text-[14px] text-zinc-100 ring-1 ring-white/[0.08] transition-colors placeholder:text-zinc-600 focus:bg-white/[0.06] focus:ring-emerald-300/40 focus:outline-none'

  return (
    <div className="aurora grain pt-safe pb-safe grid h-full place-items-center overflow-y-auto px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <img src="/favicon.svg" alt="" className="size-12 rounded-2xl ring-1 ring-white/10" />
        <h1 className="mt-8 font-display text-5xl leading-[0.95] text-white">
          Estúdio <em className="bg-gradient-to-r from-emerald-300 to-sky-300 bg-clip-text text-transparent">Mídia</em>
        </h1>
        <p className="mt-3 text-[13.5px] text-zinc-500">Produção de conteúdo · Vereador Julio Cezar & Deputada Aurelina Medeiros</p>

        <form onSubmit={submit} className="mt-10 space-y-3">
          <input type="email" required autoFocus autoComplete="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
          <input type="password" required autoComplete="current-password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
          {error && <p className="px-1 text-[12.5px] text-rose-300">{error}</p>}
          <button
            disabled={busy}
            className={clsx(
              'group flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-[14px] font-semibold text-ink-950 shadow-[0_10px_40px_-10px_rgb(255_255_255/0.35)] transition-transform hover:scale-[1.01] active:scale-[0.99]',
              busy && 'opacity-60',
            )}
          >
            {busy ? 'Entrando…' : 'Entrar'}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </form>
        <p className="mt-6 text-[12px] text-zinc-600">Sem acesso? Peça à coordenação para cadastrar você.</p>
      </motion.div>
    </div>
  )
}
