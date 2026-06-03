import { getDb } from '../../_db.js'
import { requireAuth, corsHeaders } from '../../_auth.js'

export default async function handler(req, res) {
  corsHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  const payload = await requireAuth(req, res)
  if (!payload) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' })
  try {
    const sql = getDb()
    const data = await sql`
      SELECT collaborator, month, "valorRecebido", "statusPagamento", comissao
      FROM "itrDeclarations" WHERE "userId" = ${payload.id}
    `
    const map = {}
    for (const d of data) {
      if (!map[d.collaborator]) map[d.collaborator] = { collaborator: d.collaborator, months: {} }
      if (!map[d.collaborator].months[d.month]) map[d.collaborator].months[d.month] = { vendas: 0, recebido: 0, comissao: 0 }
      map[d.collaborator].months[d.month].vendas++
      map[d.collaborator].months[d.month].recebido += d.valorRecebido || 0
      if (d.statusPagamento === 'PAGO') map[d.collaborator].months[d.month].comissao += d.comissao || 0
    }
    res.status(200).json(Object.values(map))
  } catch (err) {
    console.error('[commissions/itr]', err)
    res.status(500).json({ error: 'Erro interno' })
  }
}
