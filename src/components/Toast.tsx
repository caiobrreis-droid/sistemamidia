import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

const Ctx = createContext<(msg: string) => void>(() => {})
export const useToast = () => useContext(Ctx)

/** Minimal error toasts, bottom-center. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([])
  const n = useRef(0)
  const show = useCallback((msg: string) => {
    const id = ++n.current
    setItems((list) => [...list.filter((i) => i.msg !== msg), { id, msg }].slice(-3))
    setTimeout(() => setItems((list) => list.filter((i) => i.id !== id)), 4500)
  }, [])

  return (
    <Ctx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-2.5 rounded-full bg-ink-800/95 px-4 py-2.5 text-[13px] text-zinc-100 ring-1 ring-white/10 shadow-2xl backdrop-blur-xl"
            >
              <AlertCircle className="size-4 text-rose-300" />
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}
