import { getDb } from '../../_db.js'
import { requireAuth, corsHeaders } from '../../_auth.js'

export default async function handler(req, res) {
  corsHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  const payload = await requireAuth(req, res)
  if (!payload) return

  const id = parseInt(req.query.id)
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' })

  const sql = getDb()
  try {
    const [quota] = await sql`SELECT id FROM quotas WHERE id = ${id} AND "userId" = ${payload.id} LIMIT 1`
    if (!quota) return res.status(404).json({ error: 'Quota não encontrada' })

    if (req.method === 'PUT') {
      const { cotasEnviadas, collaborator, cliente, quantidadeCotas, meioEnvio } = req.body
      const [updated] = await sql`
        UPDATE quotas SET
          "cotasEnviadas" = COALESCE(${cotasEnviadas ?? null}, "cotasEnviadas"),
          collaborator = COALESCE(${collaborator || null}, collaborator),
          cliente = COALESCE(${cliente || null}, cliente),
          "quantidadeCotas" = COALESCE(${quantidadeCotas ?? null}, "quantidadeCotas"),
          "meioEnvio" = COALESCE(${meioEnvio || null}, "meioEnvio"),
          "updatedAt" = NOW()
        WHERE id = ${id}
        RETURNING *
      `
      return res.status(200).json(updated)
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM quotas WHERE id = ${id}`
      return res.status(200).json({ success: true })
    }

    res.status(405).json({ error: 'Método não permitido' })
  } catch (err) {
    console.error('[quotas/[id]]', err)
    res.status(500).json({ error: 'Erro interno' })
  }
}
