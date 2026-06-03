import { getDb } from '../../_db.js'
import { requireAuth, corsHeaders } from '../../_auth.js'

export default async function handler(req, res) {
  corsHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const payload = await requireAuth(req, res)
  if (!payload) return

  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Método não permitido' })

  const { month } = req.query
  if (!month) return res.status(400).json({ error: 'month obrigatório' })

  try {
    const sql = getDb()
    await sql`DELETE FROM declarations WHERE "userId" = ${payload.id} AND month = ${month}`
    res.status(200).json({ success: true })
  } catch (err) {
    console.error('[declarations/all]', err)
    res.status(500).json({ error: 'Erro interno' })
  }
}
