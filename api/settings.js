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
      const rows = await sql`SELECT * FROM settings WHERE "userId" = ${userId} LIMIT 1`
      return res.status(200).json(rows[0] || { percentualDiversos: 10, valorFixoSocio: 500 })
    }

    if (req.method === 'PUT') {
      const { percentualDiversos, valorFixoSocio } = req.body
      const [row] = await sql`
        INSERT INTO settings ("userId", "percentualDiversos", "valorFixoSocio")
        VALUES (${userId}, ${percentualDiversos ?? 10}, ${valorFixoSocio ?? 500})
        ON CONFLICT ("userId") DO UPDATE SET
          "percentualDiversos" = COALESCE(${percentualDiversos ?? null}, settings."percentualDiversos"),
          "valorFixoSocio" = COALESCE(${valorFixoSocio ?? null}, settings."valorFixoSocio"),
          "updatedAt" = NOW()
        RETURNING *
      `
      return res.status(200).json(row)
    }

    res.status(405).json({ error: 'Método não permitido' })
  } catch (err) {
    console.error('[settings]', err)
    res.status(500).json({ error: 'Erro interno' })
  }
}
