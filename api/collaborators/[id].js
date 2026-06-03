import { getDb } from '../../_db.js'
import { requireAuth, corsHeaders } from '../../_auth.js'

export default async function handler(req, res) {
  corsHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const payload = await requireAuth(req, res)
  if (!payload) return

  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Método não permitido' })

  const id = parseInt(req.query.id)
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' })

  try {
    const sql = getDb()
    await sql`DELETE FROM collaborators WHERE id = ${id} AND "userId" = ${payload.id}`
    res.status(200).json({ success: true })
  } catch (err) {
    console.error('[collaborators/[id]]', err)
    res.status(500).json({ error: 'Erro interno' })
  }
}
