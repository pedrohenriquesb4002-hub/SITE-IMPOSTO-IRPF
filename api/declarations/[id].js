import { getDb, calculateCommission } from '../../_db.js'
import { requireAuth, corsHeaders } from '../../_auth.js'

export default async function handler(req, res) {
  corsHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const payload = await requireAuth(req, res)
  if (!payload) return

  const userId = payload.id
  const id = parseInt(req.query.id)
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' })

  const sql = getDb()

  try {
    // Verify ownership
    const [decl] = await sql`SELECT id FROM declarations WHERE id = ${id} AND "userId" = ${userId} LIMIT 1`
    if (!decl) return res.status(404).json({ error: 'Declaração não encontrada' })

    if (req.method === 'PUT') {
      const { collaborator, cpfCliente, cliente, valorRecebido, clienteType, statusPagamento } = req.body

      // Fetch current for partial updates
      const [current] = await sql`SELECT * FROM declarations WHERE id = ${id} LIMIT 1`
      const newValor = valorRecebido ?? current.valorRecebido
      const newType = clienteType ?? current.clienteType
      const newStatus = statusPagamento ?? current.statusPagamento

      const settingsRows = await sql`SELECT * FROM settings WHERE "userId" = ${userId} LIMIT 1`
      const settings = settingsRows[0] || { percentualDiversos: 10, valorFixoSocio: 500 }
      const comissao = calculateCommission(newValor, newType, newStatus, settings.percentualDiversos, settings.valorFixoSocio)

      const [updated] = await sql`
        UPDATE declarations SET
          collaborator = COALESCE(${collaborator || null}, collaborator),
          "cpfCliente" = COALESCE(${cpfCliente ?? null}, "cpfCliente"),
          cliente = COALESCE(${cliente || null}, cliente),
          "valorRecebido" = ${newValor},
          "clienteType" = ${newType},
          "statusPagamento" = ${newStatus},
          comissao = ${comissao},
          "updatedAt" = NOW()
        WHERE id = ${id}
        RETURNING *
      `
      return res.status(200).json(updated)
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM declarations WHERE id = ${id}`
      return res.status(200).json({ success: true })
    }

    res.status(405).json({ error: 'Método não permitido' })
  } catch (err) {
    console.error('[declarations/[id]]', err)
    res.status(500).json({ error: 'Erro interno' })
  }
}
