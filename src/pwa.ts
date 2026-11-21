import { useEffect, useState, useSyncExternalStore } from 'react'

/** Chrome/Edge/Android fire this when the app can be installed. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

export function registerPwa() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    emit()
  })
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('Service worker não registrado', e))
  }
}

export function useInstall() {
  const canPrompt = useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => deferred !== null,
  )
  const install = async () => {
    if (!deferred) return false
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    deferred = null
    emit()
    return outcome === 'accepted'
  }
  return { canPrompt, install, installed: isStandalone() }
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Falha ao configurar notificações')
  return data
}

export type PushState = 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on' | 'loading'

export function usePush() {
  const [state, setState] = useState<PushState>('loading')

  const refresh = async () => {
    if (isIOS && !isStandalone()) return setState('needs-install')
    if (!pushSupported()) return setState('unsupported')
    if (Notification.permission === 'denied') return setState('denied')
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    setState(sub && Notification.permission === 'granted' ? 'on' : 'off')
  }

  useEffect(() => {
    refresh()
  }, [])

  const enable = async () => {
    setState('loading')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return refresh()
      const { key } = await (await fetch('/api/push/key')).json()
      if (!key) throw new Error('Notificações ainda não configuradas no servidor')
      const reg = await navigator.serviceWorker.ready
      const sub =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }))
      await post('/api/push/subscribe', { subscription: sub.toJSON() })
      await post('/api/push/test', {})
      setState('on')
    } catch (e) {
      await refresh()
      throw e
    }
  }

  const disable = async () => {
    setState('loading')
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await post('/api/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {})
      await sub.unsubscribe()
    }
    setState('off')
  }

  return { state, enable, disable }
}
