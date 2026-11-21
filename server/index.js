import express from 'express'
import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hashPassword, id, migrate, pickColor, pool, verifyPassword } from './db.js'

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
  res.json({ user: publicUser(user) })
}))

app.post('/api/logout', wrap(async (req, res) => {
  const token = readCookie(req, COOKIE)
  if (token) await pool.query('DELETE FROM sessions WHERE token = $1', [token])
  setSessionCookie(res, '', 0)
  res.json({ ok: true })
}))

app.get('/api/me', auth, (req, res) => res.json({ user: publicUser(req.user) }))

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
}))

app.put('/api/cards/:id', auth, wrap(async (req, res) => {
  const { rowCount } = await pool.query('UPDATE cards SET data = $2, updated_at = now() WHERE id = $1', [req.params.id, cleanCard(req.body?.card)])
  if (!rowCount) return res.status(404).json({ error: 'Cartão não encontrado' })
  broadcast(req.get('x-client-id'))
  res.json({ ok: true })
}))

app.post('/api/cards/:id/move', auth, wrap(async (req, res) => {
  const { toColumn, toIndex } = req.body || {}
  await tx((c) => place(c, req.params.id, String(toColumn), Number(toIndex) || 0))
  broadcast(req.get('x-client-id'))
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
app.listen(PORT, () => console.log(`Estúdio Mídia rodando na porta ${PORT}`))
