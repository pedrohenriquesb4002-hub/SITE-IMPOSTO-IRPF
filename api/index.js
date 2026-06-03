import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { neon } from '@neondatabase/serverless'

let _sql = null
function getDb() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL não configurado')
    _sql = neon(process.env.DATABASE_URL)
  }
  return _sql
}

function calcComissao(valor, tipo, status, pct = 10, fixo = 500) {
  if (status === 'DOAÇÃO') return 0
  if (tipo === 'Sócio') return fixo
  return Math.round(valor * (pct / 100))
}

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'change-this-secret-in-production-min-32-chars'
)
async function signToken(payload) {
  return new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('8h').sign(secret)
}
async function verifyToken(token) {
  try { return (await jwtVerify(token, secret)).payload } catch { return null }
}
async function auth(req, res) {
  const h = req.headers['authorization']
  if (!h?.startsWith('Bearer ')) { res.status(401).json({ error: 'Não autorizado' }); return null }
  const p = await verifyToken(h.slice(7))
  if (!p) { res.status(401).json({ error: 'Token inválido' }); return null }
  return p
}

function setHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Registration-Secret')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
}

export default async function handler(req, res) {
  setHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const url = req.url.replace(/^\/api/, '')
  const sql = getDb()

  try {
    if (url === '/auth/login' && req.method === 'POST') {
      const { username, password } = req.body
      if (!username || !password) return res.status(400).json({ error: 'Usuário e senha obrigatórios' })
      const rows = await sql`SELECT * FROM users WHERE username = ${username.trim()} LIMIT 1`
      const user = rows[0]
      if (!user || !(await bcrypt.compare(password, user.password_hash)))
        return res.status(401).json({ error: 'Credenciais inválidas' })
      await sql`UPDATE users SET "lastSignedIn" = NOW() WHERE id = ${user.id}`
      const token = await signToken({ id: user.id, username: user.username, role: user.role })
      return res.status(200).json({ token, user: { id: user.id, username: user.username, name: user.name, email: user.email, role: user.role } })
    }

    if (url === '/auth/register' && req.method === 'POST') {
      const count = parseInt((await sql`SELECT COUNT(*) as c FROM users`)[0].c)
      if (count > 0) {
        const s = req.headers['x-registration-secret']
        if (!s || s !== process.env.REGISTRATION_SECRET)
          return res.status(403).json({ error: 'Registro desabilitado' })
      }
      const { username, password, name } = req.body
      if (!username || !password) return res.status(400).json({ error: 'Campos obrigatórios' })
      if (password.length < 8) return res.status(400).json({ error: 'Senha mínimo 8 caracteres' })
      const ex = await sql`SELECT id FROM users WHERE username = ${username.trim()} LIMIT 1`
      if (ex.length > 0) return res.status(409).json({ error: 'Usuário já existe' })
      const hash = await bcrypt.hash(password, 12)
      const [user] = await sql`INSERT INTO users (username, password_hash, name, role) VALUES (${username.trim()}, ${hash}, ${name || username.trim()}, ${count === 0 ? 'admin' : 'user'}) RETURNING id, username, name, email, role`
      const token = await signToken({ id: user.id, username: user.username, role: user.role })
      return res.status(201).json({ token, user })
    }

    if (url === '/auth/me' && req.method === 'GET') {
      const p = await auth(req, res); if (!p) return
      const [user] = await sql`SELECT id, username, name, email, role FROM users WHERE id = ${p.id} LIMIT 1`
      if (!user) return res.status(404).json({ error: 'Não encontrado' })
      return res.status(200).json(user)
    }

    const p = await auth(req, res); if (!p) return
    const userId = p.id

    async function getSettings() {
      const r = await sql`SELECT * FROM settings WHERE "userId" = ${userId} LIMIT 1`
      return r[0] || { percentualDiversos: 10, valorFixoSocio: 500 }
    }

    if (url.startsWith('/declarations')) {
      const idMatch = url.match(/\/declarations\/(\d+)$/)
      const isAll = url.includes('/declarations/all')
      if (isAll && req.method === 'DELETE') {
        await sql`DELETE FROM declarations WHERE "userId" = ${userId} AND month = ${req.query.month}`
        return res.status(200).json({ success: true })
      }
      if (idMatch) {
        const id = parseInt(idMatch[1])
        const [own] = await sql`SELECT id FROM declarations WHERE id = ${id} AND "userId" = ${userId} LIMIT 1`
        if (!own) return res.status(404).json({ error: 'Não encontrado' })
        if (req.method === 'PUT') {
          const { collaborator, cpfCliente, cliente, valorRecebido, clienteType, statusPagamento } = req.body
          const [cur] = await sql`SELECT * FROM declarations WHERE id = ${id} LIMIT 1`
          const s = await getSettings()
          const nv = valorRecebido ?? cur.valorRecebido
          const nt = clienteType ?? cur.clienteType
          const ns = statusPagamento ?? cur.statusPagamento
          const comissao = calcComissao(nv, nt, ns, s.percentualDiversos, s.valorFixoSocio)
          const [u] = await sql`UPDATE declarations SET collaborator=COALESCE(${collaborator||null},collaborator),"cpfCliente"=COALESCE(${cpfCliente??null},"cpfCliente"),cliente=COALESCE(${cliente||null},cliente),"valorRecebido"=${nv},"clienteType"=${nt},"statusPagamento"=${ns},comissao=${comissao},"updatedAt"=NOW() WHERE id=${id} RETURNING *`
          return res.status(200).json(u)
        }
        if (req.method === 'DELETE') {
          await sql`DELETE FROM declarations WHERE id = ${id}`
          return res.status(200).json({ success: true })
        }
      }
      if (req.method === 'GET') {
        const rows = await sql`SELECT * FROM declarations WHERE "userId"=${userId} AND month=${req.query.month} ORDER BY "createdAt" DESC`
        return res.status(200).json(rows)
      }
      if (req.method === 'POST') {
        const { month, collaborator, cpfCliente, cliente, valorRecebido, clienteType, statusPagamento } = req.body
        const s = await getSettings()
        const comissao = calcComissao(valorRecebido, clienteType, statusPagamento, s.percentualDiversos, s.valorFixoSocio)
        const [row] = await sql`INSERT INTO declarations ("userId",month,collaborator,"cpfCliente",cliente,"valorRecebido","clienteType",comissao,"statusPagamento") VALUES (${userId},${month},${collaborator},${cpfCliente||null},${cliente},${valorRecebido},${clienteType},${comissao},${statusPagamento}) RETURNING *`
        return res.status(201).json(row)
      }
    }

    if (url.startsWith('/itr')) {
      const idMatch = url.match(/\/itr\/(\d+)$/)
      const isAll = url.includes('/itr/all')
      if (isAll && req.method === 'DELETE') {
        await sql`DELETE FROM "itrDeclarations" WHERE "userId"=${userId} AND month=${req.query.month}`
        return res.status(200).json({ success: true })
      }
      if (idMatch) {
        const id = parseInt(idMatch[1])
        const [own] = await sql`SELECT id FROM "itrDeclarations" WHERE id=${id} AND "userId"=${userId} LIMIT 1`
        if (!own) return res.status(404).json({ error: 'Não encontrado' })
        if (req.method === 'PUT') {
          const { collaborator, cpfCliente, cliente, valorRecebido, clienteType, statusPagamento } = req.body
          const [cur] = await sql`SELECT * FROM "itrDeclarations" WHERE id=${id} LIMIT 1`
          const s = await getSettings()
          const nv = valorRecebido ?? cur.valorRecebido
          const nt = clienteType ?? cur.clienteType
          const ns = statusPagamento ?? cur.statusPagamento
          const comissao = calcComissao(nv, nt, ns, s.percentualDiversos, s.valorFixoSocio)
          const [u] = await sql`UPDATE "itrDeclarations" SET collaborator=COALESCE(${collaborator||null},collaborator),"cpfCliente"=COALESCE(${cpfCliente??null},"cpfCliente"),cliente=COALESCE(${cliente||null},cliente),"valorRecebido"=${nv},"clienteType"=${nt},"statusPagamento"=${ns},comissao=${comissao},"updatedAt"=NOW() WHERE id=${id} RETURNING *`
          return res.status(200).json(u)
        }
        if (req.method === 'DELETE') {
          await sql`DELETE FROM "itrDeclarations" WHERE id=${id}`
          return res.status(200).json({ success: true })
        }
      }
      if (req.method === 'GET') {
        const rows = await sql`SELECT * FROM "itrDeclarations" WHERE "userId"=${userId} AND month=${req.query.month} ORDER BY "createdAt" DESC`
        return res.status(200).json(rows)
      }
      if (req.method === 'POST') {
        const { month, collaborator, cpfCliente, cliente, valorRecebido, clienteType, statusPagamento } = req.body
        const s = await getSettings()
        const comissao = calcComissao(valorRecebido, clienteType, statusPagamento, s.percentualDiversos, s.valorFixoSocio)
        const [row] = await sql`INSERT INTO "itrDeclarations" ("userId",month,collaborator,"cpfCliente",cliente,"valorRecebido","clienteType",comissao,"statusPagamento") VALUES (${userId},${month},${collaborator},${cpfCliente||null},${cliente},${valorRecebido},${clienteType},${comissao},${statusPagamento}) RETURNING *`
        return res.status(201).json(row)
      }
    }

    if (url.startsWith('/collaborators')) {
      const idMatch = url.match(/\/collaborators\/(\d+)$/)
      if (idMatch) {
        const id = parseInt(idMatch[1])
        if (req.method === 'DELETE') {
          await sql`DELETE FROM collaborators WHERE id=${id} AND "userId"=${userId}`
          return res.status(200).json({ success: true })
        }
      }
      if (req.method === 'GET') {
        const rows = await sql`SELECT * FROM collaborators WHERE "userId"=${userId} ORDER BY name ASC`
        return res.status(200).json(rows)
      }
      if (req.method === 'POST') {
        const { name } = req.body
        if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatório' })
        try {
          const [row] = await sql`INSERT INTO collaborators ("userId",name) VALUES (${userId},${name.trim()}) RETURNING *`
          return res.status(201).json(row)
        } catch (e) {
          if (e.code === '23505') return res.status(409).json({ error: 'Colaborador já existe' })
          throw e
        }
      }
    }

    if (url === '/settings') {
      if (req.method === 'GET') return res.status(200).json(await getSettings())
      if (req.method === 'PUT') {
        const { percentualDiversos, valorFixoSocio } = req.body
        const [row] = await sql`INSERT INTO settings ("userId","percentualDiversos","valorFixoSocio") VALUES (${userId},${percentualDiversos??10},${valorFixoSocio??500}) ON CONFLICT ("userId") DO UPDATE SET "percentualDiversos"=COALESCE(${percentualDiversos??null},settings."percentualDiversos"),"valorFixoSocio"=COALESCE(${valorFixoSocio??null},settings."valorFixoSocio"),"updatedAt"=NOW() RETURNING *`
        return res.status(200).json(row)
      }
    }

    if (url === '/commissions' || url === '/commissions/itr') {
      const isItr = url.includes('/itr')
      const data = isItr
        ? await sql`SELECT collaborator,month,"valorRecebido","statusPagamento",comissao FROM "itrDeclarations" WHERE "userId"=${userId}`
        : await sql`SELECT collaborator,month,"valorRecebido","statusPagamento",comissao FROM declarations WHERE "userId"=${userId}`
      const map = {}
      for (const d of data) {
        if (!map[d.collaborator]) map[d.collaborator] = { collaborator: d.collaborator, months: {} }
        if (!map[d.collaborator].months[d.month]) map[d.collaborator].months[d.month] = { vendas: 0, recebido: 0, comissao: 0 }
        map[d.collaborator].months[d.month].vendas++
        map[d.collaborator].months[d.month].recebido += d.valorRecebido || 0
        if (d.statusPagamento === 'PAGO') map[d.collaborator].months[d.month].comissao += d.comissao || 0
      }
      return res.status(200).json(Object.values(map))
    }

    if (url.startsWith('/quotas')) {
      const idMatch = url.match(/\/quotas\/(\d+)$/)
      if (idMatch) {
        const id = parseInt(idMatch[1])
        const [own] = await sql`SELECT id FROM quotas WHERE id=${id} AND "userId"=${userId} LIMIT 1`
        if (!own) return res.status(404).json({ error: 'Não encontrado' })
        if (req.method === 'PUT') {
          const { cotasEnviadas, collaborator, cliente, quantidadeCotas, meioEnvio } = req.body
          const [u] = await sql`UPDATE quotas SET "cotasEnviadas"=COALESCE(${cotasEnviadas??null},"cotasEnviadas"),collaborator=COALESCE(${collaborator||null},collaborator),cliente=COALESCE(${cliente||null},cliente),"quantidadeCotas"=COALESCE(${quantidadeCotas??null},"quantidadeCotas"),"meioEnvio"=COALESCE(${meioEnvio||null},"meioEnvio"),"updatedAt"=NOW() WHERE id=${id} RETURNING *`
          return res.status(200).json(u)
        }
        if (req.method === 'DELETE') {
          await sql`DELETE FROM quotas WHERE id=${id}`
          return res.status(200).json({ success: true })
        }
      }
      if (req.method === 'GET') {
        const rows = await sql`SELECT * FROM quotas WHERE "userId"=${userId} ORDER BY "createdAt" DESC`
        return res.status(200).json(rows)
      }
      if (req.method === 'POST') {
        const { collaborator, cliente, quantidadeCotas, cotasEnviadas, meioEnvio } = req.body
        const [row] = await sql`INSERT INTO quotas ("userId",collaborator,cliente,"quantidadeCotas","cotasEnviadas","meioEnvio") VALUES (${userId},${collaborator},${cliente},${quantidadeCotas},${cotasEnviadas||0},${meioEnvio}) RETURNING *`
        return res.status(201).json(row)
      }
    }

    if (url === '/import' && req.method === 'POST') {
      const { declarations, collaborators } = req.body
      const s = await getSettings()
      for (const name of (collaborators || [])) {
        await sql`INSERT INTO collaborators ("userId",name) VALUES (${userId},${name}) ON CONFLICT DO NOTHING`
      }
      let imported = 0
      const errors = []
      for (const row of (declarations || [])) {
        try {
          const { collaborator, cliente, cpfCliente, valorRecebido, clienteType, statusPagamento, month, categoria } = row
          if (!collaborator || !cliente || !month) continue
          const comissao = calcComissao(valorRecebido||0, clienteType||'Diversos', statusPagamento||'AGUARDANDO', s.percentualDiversos, s.valorFixoSocio)
          if ((categoria||'IRPF').toUpperCase() === 'ITR') {
            await sql`INSERT INTO "itrDeclarations" ("userId",month,collaborator,"cpfCliente",cliente,"valorRecebido","clienteType",comissao,"statusPagamento") VALUES (${userId},${month},${collaborator},${cpfCliente||null},${cliente},${valorRecebido||0},${clienteType||'Diversos'},${comissao},${statusPagamento||'AGUARDANDO'})`
          } else {
            await sql`INSERT INTO declarations ("userId",month,collaborator,"cpfCliente",cliente,"valorRecebido","clienteType",comissao,"statusPagamento") VALUES (${userId},${month},${collaborator},${cpfCliente||null},${cliente},${valorRecebido||0},${clienteType||'Diversos'},${comissao},${statusPagamento||'AGUARDANDO'})`
          }
          imported++
        } catch (e) { errors.push(`Erro linha ${imported+errors.length+1}: ${e.message}`) }
      }
      return res.status(200).json({ imported, errors })
    }

    if (url === '/export' && req.method === 'GET') {
      const irpfMonths = ['Março','Abril','Maio']
      const itrMonths = ['Agosto','Setembro']
      const irpf = {}
      for (const m of irpfMonths) irpf[m] = await sql`SELECT * FROM declarations WHERE "userId"=${userId} AND month=${m} ORDER BY collaborator`
      const itr = {}
      for (const m of itrMonths) itr[m] = await sql`SELECT * FROM "itrDeclarations" WHERE "userId"=${userId} AND month=${m} ORDER BY collaborator`
      const all = [...Object.values(irpf).flat(), ...Object.values(itr).flat()]
      const cm = {}
      for (const d of all) {
        if (!cm[d.collaborator]) cm[d.collaborator] = { collaborator: d.collaborator, totalVendas: 0, totalRecebido: 0, totalComissao: 0 }
        cm[d.collaborator].totalVendas++
        cm[d.collaborator].totalRecebido += d.valorRecebido||0
        if (d.statusPagamento === 'PAGO') cm[d.collaborator].totalComissao += d.comissao||0
      }
      return res.status(200).json({ irpf, itr, commissions: Object.values(cm) })
    }

    res.status(404).json({ error: 'Rota não encontrada' })
  } catch (err) {
    console.error('[API Error]', err)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}