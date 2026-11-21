import { useEffect, useState } from 'react'
import { api } from './api'
import { Login } from './Login'
import { Workspace } from './Workspace'
import { ToastProvider } from './components/Toast'
import type { Member } from './types'

export default function App() {
  const [user, setUser] = useState<Member | null | undefined>(undefined)

  useEffect(() => {
    api.me().then((r) => setUser(r.user), () => setUser(null))
  }, [])

  const logout = async () => {
    await api.logout().catch(() => {})
    setUser(null)
  }

  if (user === undefined) return <div className="aurora h-full" />
  return <ToastProvider>{user ? <Workspace user={user} onLogout={logout} /> : <Login onLogin={setUser} />}</ToastProvider>
}
