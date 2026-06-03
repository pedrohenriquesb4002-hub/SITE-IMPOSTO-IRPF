import bcrypt from 'bcryptjs'
import { getDb } from '../_db.js'
import { signToken, corsHeaders } from '../_auth.js'

export default async function handler(req, res) {
  corsHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  try {
    const sql = getDb()

    // Only allow registration if no users exist yet (first run)
    const existing = await sql`SELECT COUNT(*) as count FROM users`
    if (parseInt(existing[0].count) > 0) {
      // Also allow if REGISTRATION_SECRET matches
      const secret = req.headers['x-registration-secret']
      if (!secret || secret !== process.env.REGISTRATION_SECRET) {
        return res.status(403).json({ error: 'Registro desabilitado. Use a senha de registro.' })
      }
    }

    const { username, password, name } = req.body
    if (!username || !password) return res.status(400).json({ error: 'Usuário e senha obrigatórios' })
    if (password.length < 8) return res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres' })

    const existingUser = await sql`SELECT id FROM users WHERE username = ${username.trim()} LIMIT 1`
    if (existingUser.length > 0) return res.status(409).json({ error: 'Usuário já existe' })

    const hash = await bcrypt.hash(password, 12)
    const countResult = await sql`SELECT COUNT(*) as count FROM users`
    const isFirst = parseInt(countResult[0].count) === 0

    const [user] = await sql`
      INSERT INTO users (username, password_hash, name, role)
      VALUES (${username.trim()}, ${hash}, ${name || username.trim()}, ${isFirst ? 'admin' : 'user'})
      RETURNING id, username, name, email, role
    `

    const token = await signToken({ id: user.id, username: user.username, role: user.role })
    res.status(201).json({
      token,
      user: { id: user.id, username: user.username, name: user.name, email: user.email, role: user.role },
    })
  } catch (err) {
    console.error('[auth/register]', err)
    res.status(500).json({ error: 'Erro interno' })
  }
}
