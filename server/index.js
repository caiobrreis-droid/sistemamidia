import express from 'express'
import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hashPassword, id, migrate, pickColor, pool, verifyPassword } from './db.js'
import { migratePush, notifyUsers, publicKey, removeSubscription, saveSubscription, stageMessage } from './push.js'

const others = (ids, me) => (Array.isArray(ids) ? ids : []).filter((x) => x && x !== me)
const firstName = (u) => String(u.name || '').split(' ')[0]
const cardUrl = (cardId) => `/?card=${encodeURIComponent(cardId)}`

const app = express()
const PORT = Number(process.env.PORT) || 3000
const PROD = process.env.NODE_ENV === 'production'
const SESSION_DAYS = 30
const COOKIE = 'sm_session'

app.set('trust proxy', 1)
app.use(express.json({ limit: '8mb' }))

// ---------- helpers ----------
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

function readCookie(req, name) {
  const match = (req.headers.cookie || '').split(';').map((s) => s.trim()).find((s) => s.startsWith(name + '='))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

function setSessionCookie(res, token, maxAgeSec) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${PROD ? '; Secure' : ''}`,
  )
}

const publicUser = (u) => ({ id: u.id, name: u.name, role: u.role, color: u.color, email: u.email, isAdmin: u.is_admin })

const auth = wrap(async (req, res, next) => {
  const token = readCookie(req, COOKIE)
  if (!token) return res.status(401).json({ error: 'Não autenticado' })
  const { rows } = await pool.query(
    'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1 AND s.expires_at > now()',
    [token],
  )
  if (!rows[0]) return res.status(401).json({ error: 'Sessão expirada' })
  req.user = rows[0]
  next()
})

const adminOnly = (req, res, next) => (req.user?.is_admin ? next() : res.status(403).json({ error: 'Apenas administradores' }))

// ---------- realtime (SSE) ----------
const clients = new Set()
function broadcast(by) {
  const payload = `data: ${JSON.stringify({ type: 'change', by })}\n\n`
  for (const res of clients) res.write(payload)
}
setInterval(() => {
  for (const res of clients) res.write(': ping\n\n')
}, 25000)

// ---------- auth routes ----------
const attempts = new Map()
app.post('/api/login', wrap(async (req, res) => {
  const ip = req.ip
  const a = attempts.get(ip) || { n: 0, t: Date.now() }
  if (Date.now() - a.t > 15 * 60 * 1000) Object.assign(a, { n: 0, t: Date.now() })
  if (a.n >= 10) return res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos.' })

  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email])
  const user = rows[0]
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    a.n++
    attempts.set(ip, a)
    return res.status(401).json({ error: 'E-mail ou senha incorretos' })
  }
  attempts.delete(ip)
  const token = randomBytes(32).toString('hex')
  await pool.query(`INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, now() + interval '${SESSION_DAYS} days')`, [token, user.id])
  await pool.query('DELETE FROM sessions WHERE expires_at < now()')
  setSessionCookie(res, token, SESSION_DAYS * 86400)
  res.json({ user: { ...publicUser(user), prefs: user.prefs || {} } })
}))

app.post('/api/logout', wrap(async (req, res) => {
  const token = readCookie(req, COOKIE)
  if (token) await pool.query('DELETE FROM sessions WHERE token = $1', [token])
  setSessionCookie(res, '', 0)
  res.json({ ok: true })
}))

app.get('/api/me', auth, (req, res) => res.json({ user: { ...publicUser(req.user), prefs: req.user.prefs || {} } }))

// Personal preferences: only the owner reads them (they can hold a large background image).
app.put('/api/me/prefs', auth, wrap(async (req, res) => {
  const prefs = req.body?.prefs
  if (!prefs || typeof prefs !== 'object' || Array.isArray(prefs)) return res.status(400).json({ error: 'Preferências inválidas' })
  if (JSON.stringify(prefs).length > 4_000_000) return res.status(413).json({ error: 'Imagem muito grande. Use uma imagem menor.' })
  await pool.query('UPDATE users SET prefs = $2 WHERE id = $1', [req.user.id, prefs])
  res.json({ ok: true })
}))

app.get('/api/events', auth, (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' })
  res.write(': ok\n\n')
  clients.add(res)
  req.on('close', () => clients.delete(res))
})

// ---------- board ----------
app.get('/api/board', auth, wrap(async (_req, res) => {
  const [cols, cards, users] = await Promise.all([
    pool.query('SELECT * FROM board_columns ORDER BY position'),
    pool.query('SELECT id, column_id, data FROM cards ORDER BY column_id, position'),
    pool.query('SELECT * FROM users ORDER BY created_at'),
  ])
  const columns = cols.rows.map((c) => ({
    id: c.id, title: c.title, hint: c.hint, accent: c.accent,
    cardIds: cards.rows.filter((k) => k.column_id === c.id).map((k) => k.id),
  }))
  res.json({
    columns,
    cards: Object.fromEntries(cards.rows.map((k) => [k.id, { ...k.data, id: k.id }])),
    members: users.rows.map(publicUser),
  })
}))

/** Place a card at `index` inside `columnId`, renumbering positions. Runs inside a transaction. */
async function place(client, cardId, columnId, index) {
  const { rows } = await client.query('SELECT id FROM cards WHERE column_id = $1 AND id <> $2 ORDER BY position FOR UPDATE', [columnId, cardId])
  const ids = rows.map((r) => r.id)
  ids.splice(Math.max(0, Math.min(index, ids.length)), 0, cardId)
  await client.query(
    'UPDATE cards SET column_id = $1, position = v.pos FROM unnest($2::text[]) WITH ORDINALITY AS v(cid, pos) WHERE cards.id = v.cid',
    [columnId, ids],
  )
}

async function tx(fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const out = await fn(client)
    await client.query('COMMIT')
    return out
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

const cleanCard = (c) => {
  const { id: _id, ...data } = c || {}
  return data
}

app.post('/api/cards', auth, wrap(async (req, res) => {
  const { columnId, card } = req.body || {}
  if (!card?.id || !columnId) return res.status(400).json({ error: 'Dados inválidos' })
  await tx(async (c) => {
    await c.query('INSERT INTO cards (id, column_id, position, data) VALUES ($1, $2, 1e6, $3)', [card.id, columnId, cleanCard(card)])
    const { rows } = await c.query('SELECT count(*)::int AS n FROM cards WHERE column_id = $1', [columnId])
    await place(c, card.id, columnId, rows[0].n)
  })
  broadcast(req.get('x-client-id'))
  res.status(201).json({ ok: true })
  notifyUsers(others(card.memberIds, req.user.id), {
    title: 'Você foi incluído em uma pauta',
    body: `${card.title} · por ${firstName(req.user)}`,
    url: cardUrl(card.id),
    tag: `card-${card.id}`,
  })
}))

app.put('/api/cards/:id', auth, wrap(async (req, res) => {
  const next = cleanCard(req.body?.card)
  const { rows } = await pool.query('SELECT data FROM cards WHERE id = $1', [req.params.id])
  if (!rows[0]) return res.status(404).json({ error: 'Cartão não encontrado' })
  await pool.query('UPDATE cards SET data = $2, updated_at = now() WHERE id = $1', [req.params.id, next])
  broadcast(req.get('x-client-id'))
  res.json({ ok: true })

  // Notify people newly assigned, and assignees about new comments.
  const prev = rows[0].data || {}
  const url = cardUrl(req.params.id)
  const tag = `card-${req.params.id}`
  const added = others((next.memberIds || []).filter((m) => !(prev.memberIds || []).includes(m)), req.user.id)
  notifyUsers(added, { title: 'Você foi incluído em uma pauta', body: `${next.title} · por ${firstName(req.user)}`, url, tag })
  const newComments = (next.comments || []).slice((prev.comments || []).length)
  const last = newComments.at(-1)
  if (last) {
    notifyUsers(others(next.memberIds, req.user.id).filter((m) => !added.includes(m)), {
      title: `💬 ${firstName(req.user)} comentou`,
      body: `${next.title}: ${String(last.text).slice(0, 140)}`,
      url,
      tag,
    })
  }
}))

app.post('/api/cards/:id/move', auth, wrap(async (req, res) => {
  const { toColumn, toIndex } = req.body || {}
  const { rows } = await pool.query('SELECT column_id, data FROM cards WHERE id = $1', [req.params.id])
  if (!rows[0]) return res.status(404).json({ error: 'Cartão não encontrado' })
  await tx((c) => place(c, req.params.id, String(toColumn), Number(toIndex) || 0))
  broadcast(req.get('x-client-id'))
  res.json({ ok: true })

  // Stage changed: tell the people responsible for the card.
  if (rows[0].column_id !== String(toColumn)) {
    const card = rows[0].data || {}
    notifyUsers(others(card.memberIds, req.user.id), {
      ...stageMessage(String(toColumn), card.title, firstName(req.user)),
      url: cardUrl(req.params.id),
      tag: `card-${req.params.id}`,
    })
  }
}))

// ---------- push notifications ----------
app.get('/api/push/key', auth, (_req, res) => res.json({ key: publicKey() }))

app.post('/api/push/subscribe', auth, wrap(async (req, res) => {
  try {
    await saveSubscription(req.user.id, req.body?.subscription)
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }
  res.json({ ok: true })
}))

app.post('/api/push/unsubscribe', auth, wrap(async (req, res) => {
  if (req.body?.endpoint) await removeSubscription(String(req.body.endpoint))
  res.json({ ok: true })
}))

app.post('/api/push/test', auth, wrap(async (req, res) => {
  await notifyUsers([req.user.id], { title: 'Notificações ativadas 🎉', body: 'Você vai ser avisado quando uma pauta chegar para você.', url: '/', tag: 'test' })
  res.json({ ok: true })
}))

app.delete('/api/cards/:id', auth, wrap(async (req, res) => {
  await pool.query('DELETE FROM cards WHERE id = $1', [req.params.id])
  broadcast(req.get('x-client-id'))
  res.json({ ok: true })
}))

// ---------- team ----------
app.post('/api/users', auth, adminOnly, wrap(async (req, res) => {
  const name = String(req.body?.name || '').trim()
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  const role = String(req.body?.role || '').trim()
  if (!name || !email.includes('@') || password.length < 6) return res.status(400).json({ error: 'Informe nome, e-mail válido e senha com 6+ caracteres' })
  const { rows: count } = await pool.query('SELECT count(*)::int AS n FROM users')
  try {
    const { rows } = await pool.query(
      'INSERT INTO users (id, name, role, color, email, password_hash, is_admin) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [id(), name, role, pickColor(count[0].n), email, await hashPassword(password), !!req.body?.isAdmin],
    )
    broadcast()
    res.status(201).json({ user: publicUser(rows[0]) })
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Já existe alguém com esse e-mail' })
    throw e
  }
}))

app.delete('/api/users/:id', auth, adminOnly, wrap(async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Você não pode remover a si mesmo' })
  await pool.query('DELETE FROM users WHERE id = $1', [req.params.id])
  broadcast()
  res.json({ ok: true })
}))

app.put('/api/me/password', auth, wrap(async (req, res) => {
  const { current, next } = req.body || {}
  if (!(await verifyPassword(String(current || ''), req.user.password_hash))) return res.status(400).json({ error: 'Senha atual incorreta' })
  if (String(next || '').length < 6) return res.status(400).json({ error: 'A nova senha precisa de 6+ caracteres' })
  await pool.query('UPDATE users SET password_hash = $2 WHERE id = $1', [req.user.id, await hashPassword(String(next))])
  res.json({ ok: true })
}))

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api', (_req, res) => res.status(404).json({ error: 'Rota não encontrada' }))

// ---------- static frontend ----------
const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
if (existsSync(dist)) {
  app.use('/assets', express.static(join(dist, 'assets'), { maxAge: '1y', immutable: true }))
  app.use(express.static(dist, { index: false }))
  app.get('*splat', (_req, res) => res.sendFile(join(dist, 'index.html'), { maxAge: 0 }))
}

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Erro interno no servidor' })
})

await migrate()
await migratePush()
app.listen(PORT, () => console.log(`Estúdio Mídia rodando na porta ${PORT}`))
