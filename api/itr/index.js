import { getDb, calculateCommission } from '../_db.js'
import { requireAuth, corsHeaders } from '../_auth.js'

export default async function handler(req, res) {
  corsHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const payload = await requireAuth(req, res)
  if (!payload) return

  const userId = payload.id
  const sql = getDb()

  try {
    if (req.method === 'GET') {
      const { month } = req.query
      if (!month) return res.status(400).json({ error: 'month obrigatório' })
      const rows = await sql`
        SELECT * FROM "itrDeclarations"
        WHERE "userId" = ${userId} AND month = ${month}
        ORDER BY "createdAt" DESC
      `
      return res.status(200).json(rows)
    }

    if (req.method === 'POST') {
      const { month, collaborator, cpfCliente, cliente, valorRecebido, clienteType, statusPagamento } = req.body
      if (!month || !collaborator || !cliente || valorRecebido === undefined || !clienteType || !statusPagamento) {
        return res.status(400).json({ error: 'Campos obrigatórios faltando' })
      }
      const settingsRows = await sql`SELECT * FROM settings WHERE "userId" = ${userId} LIMIT 1`
      const settings = settingsRows[0] || { percentualDiversos: 10, valorFixoSocio: 500 }
      const comissao = calculateCommission(valorRecebido, clienteType, statusPagamento, settings.percentualDiversos, settings.valorFixoSocio)

      const [row] = await sql`
        INSERT INTO "itrDeclarations" ("userId", month, collaborator, "cpfCliente", cliente, "valorRecebido", "clienteType", comissao, "statusPagamento")
        VALUES (${userId}, ${month}, ${collaborator}, ${cpfCliente || null}, ${cliente}, ${valorRecebido}, ${clienteType}, ${comissao}, ${statusPagamento})
        RETURNING *
      `
      return res.status(201).json(row)
    }

    res.status(405).json({ error: 'Método não permitido' })
  } catch (err) {
    console.error('[itr]', err)
    res.status(500).json({ error: 'Erro interno' })
  }
}
