import { getDb, calculateCommission } from '../_db.js'
import { requireAuth, corsHeaders } from '../_auth.js'

export default async function handler(req, res) {
  corsHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  const payload = await requireAuth(req, res)
  if (!payload) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  try {
    const sql = getDb()
    const userId = payload.id
    const { declarations, collaborators } = req.body

    // Get settings
    const settingsRows = await sql`SELECT * FROM settings WHERE "userId" = ${userId} LIMIT 1`
    const settings = settingsRows[0] || { percentualDiversos: 10, valorFixoSocio: 500 }

    // Import collaborators
    for (const name of (collaborators || [])) {
      try {
        await sql`INSERT INTO collaborators ("userId", name) VALUES (${userId}, ${name}) ON CONFLICT DO NOTHING`
      } catch {}
    }

    let imported = 0
    const errors = []

    for (const row of (declarations || [])) {
      try {
        const { collaborator, cliente, cpfCliente, valorRecebido, clienteType, statusPagamento, month, categoria } = row
        if (!collaborator || !cliente || !month) { errors.push(`Linha inválida: ${JSON.stringify(row)}`); continue }

        const table = (categoria || 'IRPF').toUpperCase() === 'ITR' ? '"itrDeclarations"' : 'declarations'
        const comissao = calculateCommission(valorRecebido || 0, clienteType || 'Diversos', statusPagamento || 'AGUARDANDO', settings.percentualDiversos, settings.valorFixoSocio)

        if (table === 'declarations') {
          await sql`
            INSERT INTO declarations ("userId", month, collaborator, "cpfCliente", cliente, "valorRecebido", "clienteType", comissao, "statusPagamento")
            VALUES (${userId}, ${month}, ${collaborator}, ${cpfCliente || null}, ${cliente}, ${valorRecebido || 0}, ${clienteType || 'Diversos'}, ${comissao}, ${statusPagamento || 'AGUARDANDO'})
          `
        } else {
          await sql`
            INSERT INTO "itrDeclarations" ("userId", month, collaborator, "cpfCliente", cliente, "valorRecebido", "clienteType", comissao, "statusPagamento")
            VALUES (${userId}, ${month}, ${collaborator}, ${cpfCliente || null}, ${cliente}, ${valorRecebido || 0}, ${clienteType || 'Diversos'}, ${comissao}, ${statusPagamento || 'AGUARDANDO'})
          `
        }
        imported++
      } catch (e) {
        errors.push(`Erro na linha ${imported + errors.length + 1}: ${e.message}`)
      }
    }

    res.status(200).json({ imported, errors })
  } catch (err) {
    console.error('[import]', err)
    res.status(500).json({ error: 'Erro interno' })
  }
}
