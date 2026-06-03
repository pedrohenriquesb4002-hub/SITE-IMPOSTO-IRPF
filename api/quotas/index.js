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
      const rows = await sql`SELECT * FROM quotas WHERE "userId" = ${userId} ORDER BY "createdAt" DESC`
      return res.status(200).json(rows)
    }

    if (req.method === 'POST') {
      const { collaborator, cliente, quantidadeCotas, cotasEnviadas, meioEnvio } = req.body
      if (!collaborator || !cliente || !quantidadeCotas || !meioEnvio) {
        return res.status(400).json({ error: 'Campos obrigatórios faltando' })
      }
      const [row] = await sql`
        INSERT INTO quotas ("userId", collaborator, cliente, "quantidadeCotas", "cotasEnviadas", "meioEnvio")
        VALUES (${userId}, ${collaborator}, ${cliente}, ${quantidadeCotas}, ${cotasEnviadas || 0}, ${meioEnvio})
        RETURNING *
      `
      return res.status(201).json(row)
    }

    res.status(405).json({ error: 'Método não permitido' })
  } catch (err) {
    console.error('[quotas]', err)
    res.status(500).json({ error: 'Erro interno' })
  }
}
