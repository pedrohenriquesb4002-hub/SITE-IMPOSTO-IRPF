import { getDb } from '../_db.js'
import { requireAuth, corsHeaders } from '../_auth.js'

export default async function handler(req, res) {
  corsHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const payload = await requireAuth(req, res)
  if (!payload) return

  const sql = getDb()
  const userId = payload.id

  try {
    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM collaborators WHERE "userId" = ${userId} ORDER BY name ASC`
      return res.status(200).json(rows)
    }

    if (req.method === 'POST') {
      const { name } = req.body
      if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatório' })
      try {
        const [row] = await sql`
          INSERT INTO collaborators ("userId", name)
          VALUES (${userId}, ${name.trim()})
          RETURNING *
        `
        return res.status(201).json(row)
      } catch (e) {
        if (e.code === '23505') return res.status(409).json({ error: 'Colaborador já existe' })
        throw e
      }
    }

    res.status(405).json({ error: 'Método não permitido' })
  } catch (err) {
    console.error('[collaborators]', err)
    res.status(500).json({ error: 'Erro interno' })
  }
}
