import { getDb } from '../_db.js'
import { requireAuth, corsHeaders } from '../_auth.js'

async function buildCommissions(sql, userId, table, months) {
  const rows = await sql(`SELECT * FROM ${table} WHERE "userId" = $1`, [userId])
  const map = {}
  for (const d of rows) {
    if (!map[d.collaborator]) map[d.collaborator] = { collaborator: d.collaborator, months: {} }
    const m = d.month
    if (!map[d.collaborator].months[m]) map[d.collaborator].months[m] = { vendas: 0, recebido: 0, comissao: 0 }
    map[d.collaborator].months[m].vendas++
    map[d.collaborator].months[m].recebido += d.valorRecebido || 0
    if (d.statusPagamento === 'PAGO') map[d.collaborator].months[m].comissao += d.comissao || 0
  }
  return Object.values(map)
}

export default async function handler(req, res) {
  corsHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const payload = await requireAuth(req, res)
  if (!payload) return

  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' })

  try {
    const sql = getDb()
    const userId = payload.id

    // /api/commissions/itr vs /api/commissions
    const isItr = req.url?.includes('/itr')
    if (isItr) {
      const data = await sql`
        SELECT collaborator, month, "valorRecebido", "statusPagamento", comissao
        FROM "itrDeclarations" WHERE "userId" = ${userId}
      `
      const map = {}
      for (const d of data) {
        if (!map[d.collaborator]) map[d.collaborator] = { collaborator: d.collaborator, months: {} }
        const m = d.month
        if (!map[d.collaborator].months[m]) map[d.collaborator].months[m] = { vendas: 0, recebido: 0, comissao: 0 }
        map[d.collaborator].months[m].vendas++
        map[d.collaborator].months[m].recebido += d.valorRecebido || 0
        if (d.statusPagamento === 'PAGO') map[d.collaborator].months[m].comissao += d.comissao || 0
      }
      return res.status(200).json(Object.values(map))
    }

    // IRPF commissions
    const data = await sql`
      SELECT collaborator, month, "valorRecebido", "statusPagamento", comissao
      FROM declarations WHERE "userId" = ${userId}
    `
    const map = {}
    for (const d of data) {
      if (!map[d.collaborator]) map[d.collaborator] = { collaborator: d.collaborator, months: {} }
      const m = d.month
      if (!map[d.collaborator].months[m]) map[d.collaborator].months[m] = { vendas: 0, recebido: 0, comissao: 0 }
      map[d.collaborator].months[m].vendas++
      map[d.collaborator].months[m].recebido += d.valorRecebido || 0
      if (d.statusPagamento === 'PAGO') map[d.collaborator].months[m].comissao += d.comissao || 0
    }
    return res.status(200).json(Object.values(map))
  } catch (err) {
    console.error('[commissions]', err)
    res.status(500).json({ error: 'Erro interno' })
  }
}
