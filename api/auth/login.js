import bcrypt from 'bcryptjs'
import { getDb } from '../_db.js'
import { signToken, corsHeaders } from '../_auth.js'

export default async function handler(req, res) {
  corsHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  try {
    const { username, password } = req.body
    if (!username || !password) return res.status(400).json({ error: 'Usuário e senha obrigatórios' })

    const sql = getDb()
    const rows = await sql`SELECT * FROM users WHERE username = ${username.trim()} LIMIT 1`
    const user = rows[0]

    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' })

    // Update lastSignedIn
    await sql`UPDATE users SET "lastSignedIn" = NOW() WHERE id = ${user.id}`

    const token = await signToken({ id: user.id, username: user.username, role: user.role })
    res.status(200).json({
      token,
      user: { id: user.id, username: user.username, name: user.name, email: user.email, role: user.role },
    })
  } catch (err) {
    console.error('[auth/login]', err)
    res.status(500).json({ error: 'Erro interno' })
  }
}
