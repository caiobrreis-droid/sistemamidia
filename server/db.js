import pg from 'pg'
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(_scrypt)

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não definida. Configure a variável apontando para o PostgreSQL.')
  process.exit(1)
}

const isInternal = /\.railway\.internal|localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL)
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isInternal ? false : { rejectUnauthorized: false },
  max: 10,
})

export const id = () => randomBytes(8).toString('hex')

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const key = await scrypt(password, salt, 64)
  return `${salt}:${key.toString('hex')}`
}

export async function verifyPassword(password, stored) {
  const [salt, hex] = String(stored).split(':')
  if (!salt || !hex) return false
  const key = await scrypt(password, salt, 64)
  const expected = Buffer.from(hex, 'hex')
  return expected.length === key.length && timingSafeEqual(expected, key)
}

const COLUMNS = [
  ['planejar', 'Planejar', 'Pautas e ideias', '#a78bfa'],
  ['executar', 'Executar', 'Em produção', '#60a5fa'],
  ['aprovar', 'Aprovar', 'Aguardando aprovação', '#fbbf24'],
  ['finalizar', 'Finalizar', 'Ajustes e agendamento', '#f472b6'],
  ['concluido', 'Concluído', 'Publicado', '#34d399'],
]

const COLORS = ['#34d399', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa', '#f87171', '#2dd4bf', '#fb923c']
export const pickColor = (n) => COLORS[n % COLORS.length]

export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS board_columns (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      hint TEXT NOT NULL DEFAULT '',
      accent TEXT NOT NULL,
      position INT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      column_id TEXT NOT NULL REFERENCES board_columns(id),
      position INT NOT NULL,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS cards_column_idx ON cards (column_id, position);
    -- Per-user preferences (e.g. personal background). Not shared with the team.
    ALTER TABLE users ADD COLUMN IF NOT EXISTS prefs JSONB NOT NULL DEFAULT '{}'::jsonb;
  `)

  for (const [i, [cid, title, hint, accent]] of COLUMNS.entries()) {
    await pool.query(
      'INSERT INTO board_columns (id, title, hint, accent, position) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING',
      [cid, title, hint, accent, i],
    )
  }

  // First boot: create the admin account from env so someone can log in.
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM users')
  if (rows[0].n === 0) {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
    const password = process.env.ADMIN_PASSWORD
    if (!email || !password) {
      console.warn('Nenhum usuário cadastrado. Defina ADMIN_EMAIL e ADMIN_PASSWORD para criar o administrador.')
      return
    }
    await pool.query(
      'INSERT INTO users (id, name, role, color, email, password_hash, is_admin) VALUES ($1,$2,$3,$4,$5,$6,TRUE)',
      [id(), process.env.ADMIN_NAME || 'Administrador', 'Coordenação', pickColor(0), email, await hashPassword(password)],
    )
    console.log(`Administrador criado: ${email}`)
  }
}
