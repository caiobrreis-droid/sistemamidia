// Service worker: makes the app installable and shows push notifications.
// Kept framework-free and served from the site root so its scope covers the whole app.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// Network passthrough; the app needs the server anyway (live board + login).
self.addEventListener('fetch', () => {})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data && event.data.text() }
  }
  const title = data.title || 'Estúdio Mídia'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = all.find((c) => new URL(c.url).origin === self.location.origin)
      if (existing) {
        await existing.focus()
        existing.postMessage({ type: 'open', url })
        return
      }
      await self.clients.openWindow(url)
    })(),
  )
})
