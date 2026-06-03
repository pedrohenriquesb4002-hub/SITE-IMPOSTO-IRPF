import { getDb } from '../_db.js'
import { requireAuth, corsHeaders } from '../_auth.js'

export default async function handler(req, res) {
  corsHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const payload = await requireAuth(req, res)
  if (!payload) return

  try {
    const sql = getDb()
    const [user] = await sql`SELECT id, username, name, email, role FROM users WHERE id = ${payload.id} LIMIT 1`
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
    res.status(200).json(user)
  } catch (err) {
    console.error('[auth/me]', err)
    res.status(500).json({ error: 'Erro interno' })
  }
}
