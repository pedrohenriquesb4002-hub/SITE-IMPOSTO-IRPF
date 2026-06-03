import { getDb } from '../_db.js'
import { requireAuth, corsHeaders } from '../_auth.js'

export default async function handler(req, res) {
  corsHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  const payload = await requireAuth(req, res)
  if (!payload) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' })

  try {
    const sql = getDb()
    const userId = payload.id

    const irpfMonths = ['Março', 'Abril', 'Maio']
    const itrMonths = ['Agosto', 'Setembro']

    // Fetch all IRPF declarations grouped by month
    const irpf = {}
    for (const m of irpfMonths) {
      irpf[m] = await sql`SELECT * FROM declarations WHERE "userId" = ${userId} AND month = ${m} ORDER BY collaborator, cliente`
    }

    // Fetch all ITR declarations grouped by month
    const itr = {}
    for (const m of itrMonths) {
      itr[m] = await sql`SELECT * FROM "itrDeclarations" WHERE "userId" = ${userId} AND month = ${m} ORDER BY collaborator, cliente`
    }

    // Build commissions summary
    const allDecls = [...Object.values(irpf).flat(), ...Object.values(itr).flat()]
    const commMap = {}
    for (const d of allDecls) {
      if (!commMap[d.collaborator]) commMap[d.collaborator] = { collaborator: d.collaborator, totalVendas: 0, totalRecebido: 0, totalComissao: 0 }
      commMap[d.collaborator].totalVendas++
      commMap[d.collaborator].totalRecebido += d.valorRecebido || 0
      if (d.statusPagamento === 'PAGO') commMap[d.collaborator].totalComissao += d.comissao || 0
    }

    res.status(200).json({ irpf, itr, commissions: Object.values(commMap) })
  } catch (err) {
    console.error('[export]', err)
    res.status(500).json({ error: 'Erro interno' })
  }
}
