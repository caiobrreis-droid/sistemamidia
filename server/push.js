import webpush from 'web-push'
import { pool } from './db.js'

const PUBLIC = process.env.VAPID_PUBLIC_KEY
const PRIVATE = process.env.VAPID_PRIVATE_KEY
export const pushEnabled = Boolean(PUBLIC && PRIVATE)

if (pushEnabled) {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', PUBLIC, PRIVATE)
} else {
  console.warn('VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY ausentes: notificações push desativadas.')
}

export const publicKey = () => PUBLIC || null

export async function migratePush() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      endpoint TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      keys JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
}

export async function saveSubscription(userId, sub) {
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) throw new Error('Inscrição inválida')
  await pool.query(
    `INSERT INTO push_subscriptions (endpoint, user_id, keys) VALUES ($1, $2, $3)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, keys = EXCLUDED.keys`,
    [sub.endpoint, userId, sub.keys],
  )
}

export async function removeSubscription(endpoint) {
  await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint])
}

/** Send a notification to every device of the given users. Never throws: push is best-effort. */
export async function notifyUsers(userIds, payload) {
  const ids = [...new Set(userIds)].filter(Boolean)
  if (!pushEnabled || ids.length === 0) return
  try {
    const { rows } = await pool.query('SELECT endpoint, keys FROM push_subscriptions WHERE user_id = ANY($1)', [ids])
    const body = JSON.stringify(payload)
    await Promise.all(
      rows.map(async (r) => {
        try {
          await webpush.sendNotification({ endpoint: r.endpoint, keys: r.keys }, body, { TTL: 60 * 60 * 24 })
        } catch (e) {
          // 404/410: the device unsubscribed or the subscription expired.
          if (e.statusCode === 404 || e.statusCode === 410) await removeSubscription(r.endpoint)
          else console.error('Falha ao enviar push:', e.statusCode || e.message)
        }
      }),
    )
  } catch (e) {
    console.error('Falha ao enviar notificações:', e.message)
  }
}

const STAGE_MESSAGES = {
  planejar: (t) => ({ title: 'Pauta em planejamento', body: t }),
  executar: (t) => ({ title: '🎬 Nova tarefa para executar', body: t }),
  aprovar: (t) => ({ title: 'Aguardando aprovação', body: t }),
  finalizar: (t) => ({ title: 'Aprovado — finalizar e agendar', body: t }),
  concluido: (t) => ({ title: '✅ Publicado', body: t }),
}

export function stageMessage(columnId, title, byName) {
  const m = (STAGE_MESSAGES[columnId] || ((t) => ({ title: 'Cartão movido', body: t })))(title)
  return { ...m, body: `${m.body}${byName ? ` · por ${byName}` : ''}` }
}
