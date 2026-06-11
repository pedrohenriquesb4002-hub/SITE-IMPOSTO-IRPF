import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { neon } from '@neondatabase/serverless'

// ─── DB ──────────────────────────────────────────────────────
let _sql = null
function getDb() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL não configurado')
    _sql = neon(process.env.DATABASE_URL)
  }
  return _sql
}

// ─── JWT ─────────────────────────────────────────────────────
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'TROQUE-ISSO-NO-ENV-MIN-32-CHARS!!'
)
async function signToken(payload, expiresIn = '8h') {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret)
}
async function verifyToken(token) {
  try { return (await jwtVerify(token, secret)).payload }
  catch { return null }
}

// ─── SEGURANÇA: Rate Limiting ─────────────────────────────────
async function checkRateLimit(sql, identifier, action, maxAttempts = 5, windowMinutes = 15) {
  const now = new Date()
  const windowStart = new Date(now - windowMinutes * 60 * 1000)

  const [existing] = await sql`
    SELECT * FROM "rateLimits"
    WHERE identifier = ${identifier} AND action = ${action}
    LIMIT 1
  `

  if (existing) {
    // Bloqueado?
    if (existing.blockedUntil && new Date(existing.blockedUntil) > now) {
      const remaining = Math.ceil((new Date(existing.blockedUntil) - now) / 60000)
      throw new Error(`Muitas tentativas. Tente novamente em ${remaining} minuto(s).`)
    }
    // Janela expirou — reseta
    if (new Date(existing.windowStart) < windowStart) {
      await sql`UPDATE "rateLimits" SET attempts = 1, "windowStart" = NOW(), "blockedUntil" = NULL WHERE id = ${existing.id}`
      return
    }
    // Incrementa
    const newAttempts = existing.attempts + 1
    const blocked = newAttempts >= maxAttempts
      ? new Date(now.getTime() + 30 * 60 * 1000) // bloqueia 30 min
      : null
    await sql`UPDATE "rateLimits" SET attempts = ${newAttempts}, "blockedUntil" = ${blocked} WHERE id = ${existing.id}`
    if (blocked) throw new Error('Muitas tentativas. Conta bloqueada por 30 minutos.')
  } else {
    await sql`
      INSERT INTO "rateLimits" (identifier, action, attempts, "windowStart")
      VALUES (${identifier}, ${action}, 1, NOW())
      ON CONFLICT (identifier, action) DO UPDATE SET attempts = "rateLimits".attempts + 1
    `
  }
}

async function clearRateLimit(sql, identifier, action) {
  await sql`DELETE FROM "rateLimits" WHERE identifier = ${identifier} AND action = ${action}`
}

// ─── SEGURANÇA: IP Helper ────────────────────────────────────
function getIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  )
}

// ─── SEGURANÇA: Audit Log ────────────────────────────────────
async function audit(sql, userId, action, req, details = {}) {
  try {
    await sql`
      INSERT INTO "auditLog" ("userId", action, ip, "userAgent", details)
      VALUES (${userId || null}, ${action}, ${getIP(req)}, ${req.headers['user-agent'] || ''}, ${JSON.stringify(details)})
    `
  } catch { /* não deixa o audit quebrar a requisição */ }
}

// ─── EMAIL via Resend ─────────────────────────────────────────
async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[EMAIL] RESEND_API_KEY não configurado — email não enviado')
    return false
  }
  const from = process.env.EMAIL_FROM || 'noreply@seusite.com'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from, to, subject, html }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('[EMAIL] Erro ao enviar:', err)
    return false
  }
  return true
}

// ─── COMISSÃO ────────────────────────────────────────────────
function calcComissao(valor, tipo, status, pct = 10, fixo = 500) {
  if (status === 'DOAÇÃO') return 0
  if (tipo === 'Sócio') return fixo
  return Math.round(valor * (pct / 100))
}

// ─── HEADERS de segurança ────────────────────────────────────
function setHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
}

// ─── AUTH MIDDLEWARE ─────────────────────────────────────────
async function auth(req, res) {
  const h = req.headers['authorization']
  if (!h?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Não autorizado' }); return null
  }
  const p = await verifyToken(h.slice(7))
  if (!p) { res.status(401).json({ error: 'Token inválido ou expirado' }); return null }
  return p
}

// ─── HANDLER PRINCIPAL ───────────────────────────────────────
export default async function handler(req, res) {
  setHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const url = req.url.replace(/^\/api/, '')
  const sql = getDb()
  const ip = getIP(req)

  // Sanitização básica de input
  if (req.body && typeof req.body === 'object') {
    for (const [k, v] of Object.entries(req.body)) {
      if (typeof v === 'string') req.body[k] = v.slice(0, 2000) // limite tamanho
    }
  }

  try {

    // ══════════════════════════════════════════════════════════
    // AUTH — LOGIN
    // ══════════════════════════════════════════════════════════
    if (url === '/auth/login' && req.method === 'POST') {
      const { username, password } = req.body || {}
      if (!username || !password)
        return res.status(400).json({ error: 'Usuário e senha obrigatórios' })

      // Rate limit por IP + por username
      try {
        await checkRateLimit(sql, `login:${ip}`, 'login', 10, 15)
        await checkRateLimit(sql, `login:user:${username.trim().toLowerCase()}`, 'login', 5, 15)
      } catch (e) {
        await audit(sql, null, 'login_blocked', req, { username })
        return res.status(429).json({ error: e.message })
      }

      const rows = await sql`SELECT * FROM users WHERE username = ${username.trim()} LIMIT 1`
      const user = rows[0]

      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        await audit(sql, null, 'login_failed', req, { username })
        return res.status(401).json({ error: 'Usuário ou senha incorretos' })
      }

      if (user.approvalStatus !== 'approved') {
        return res.status(403).json({ error: 'Sua conta ainda não foi aprovada pelo administrador.' })
      }

      // Login ok — limpa rate limit
      await clearRateLimit(sql, `login:${ip}`, 'login')
      await clearRateLimit(sql, `login:user:${username.trim().toLowerCase()}`, 'login')

      await sql`UPDATE users SET "lastSignedIn" = NOW() WHERE id = ${user.id}`
      await audit(sql, user.id, 'login_success', req)

      const token = await signToken({ id: user.id, username: user.username, role: user.role })
      return res.status(200).json({
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.displayName || user.name,
          email: user.email,
          role: user.role,
          photo: user.photo,
        }
      })
    }

    // ══════════════════════════════════════════════════════════
    // AUTH — CADASTRO (envia para aprovação do admin)
    // ══════════════════════════════════════════════════════════
    if (url === '/auth/register-request' && req.method === 'POST') {
      const { name, email, username, password } = req.body || {}

      if (!name?.trim() || !email?.trim() || !username?.trim() || !password)
        return res.status(400).json({ error: 'Preencha todos os campos' })

      if (password.length < 8)
        return res.status(400).json({ error: 'Senha deve ter mínimo 8 caracteres' })

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return res.status(400).json({ error: 'E-mail inválido' })

      if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username))
        return res.status(400).json({ error: 'Usuário deve ter 3-32 caracteres (letras, números, . _ -)' })

      // Rate limit: máx 3 solicitações por IP por hora
      try {
        await checkRateLimit(sql, `register:${ip}`, 'register', 3, 60)
      } catch (e) {
        return res.status(429).json({ error: e.message })
      }

      // Verifica se username ou email já existe em users ou pendentes
      const [exUser] = await sql`SELECT id FROM users WHERE username = ${username.trim()} OR email = ${email.trim()} LIMIT 1`
      if (exUser) return res.status(409).json({ error: 'Usuário ou e-mail já cadastrado' })

      const [exPending] = await sql`
        SELECT id FROM "pendingRegistrations"
        WHERE (username = ${username.trim()} OR email = ${email.trim()}) AND status = 'pending'
        LIMIT 1
      `
      if (exPending) return res.status(409).json({ error: 'Já existe uma solicitação pendente com este usuário ou e-mail' })

      const hash = await bcrypt.hash(password, 12)

      // Gera token de aprovação único
      const approvalToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('')

      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000) // 72h

      await sql`
        INSERT INTO "pendingRegistrations" (name, email, username, password_hash, "approvalToken", "expiresAt")
        VALUES (${name.trim()}, ${email.trim().toLowerCase()}, ${username.trim()}, ${hash}, ${approvalToken}, ${expiresAt})
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          username = EXCLUDED.username,
          password_hash = EXCLUDED.password_hash,
          "approvalToken" = EXCLUDED."approvalToken",
          "expiresAt" = EXCLUDED."expiresAt",
          status = 'pending',
          "requestedAt" = NOW()
      `

      // Busca email do admin
      const [adminUser] = await sql`SELECT email, name FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1`
      const adminEmail = adminUser?.email || process.env.ADMIN_EMAIL

      if (adminEmail) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'https://seusite.vercel.app'

        const approveUrl = `${baseUrl}/api/auth/approve?token=${approvalToken}&action=approve`
        const rejectUrl = `${baseUrl}/api/auth/approve?token=${approvalToken}&action=reject`

        await sendEmail({
          to: adminEmail,
          subject: `🔔 Nova solicitação de cadastro — ${name.trim()}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8f9fa;padding:20px;border-radius:12px;">
              <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:30px;border-radius:8px;text-align:center;margin-bottom:24px;">
                <h1 style="color:white;margin:0;font-size:22px;">🔔 Nova Solicitação de Cadastro</h1>
                <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;">Sistema IRPF/ITR</p>
              </div>

              <div style="background:white;padding:24px;border-radius:8px;margin-bottom:16px;border:1px solid #e2e8f0;">
                <h2 style="margin-top:0;color:#1e293b;font-size:16px;">Dados da solicitação:</h2>
                <table style="width:100%;border-collapse:collapse;">
                  <tr><td style="padding:8px 0;color:#64748b;width:120px;">Nome</td><td style="padding:8px 0;font-weight:600;color:#1e293b;">${name.trim()}</td></tr>
                  <tr><td style="padding:8px 0;color:#64748b;">E-mail</td><td style="padding:8px 0;color:#1e293b;">${email.trim()}</td></tr>
                  <tr><td style="padding:8px 0;color:#64748b;">Usuário</td><td style="padding:8px 0;color:#1e293b;">@${username.trim()}</td></tr>
                  <tr><td style="padding:8px 0;color:#64748b;">Data</td><td style="padding:8px 0;color:#1e293b;">${new Date().toLocaleString('pt-BR')}</td></tr>
                  <tr><td style="padding:8px 0;color:#64748b;">IP</td><td style="padding:8px 0;color:#1e293b;">${ip}</td></tr>
                </table>
              </div>

              <p style="color:#64748b;font-size:14px;text-align:center;margin-bottom:20px;">
                Esta solicitação expira em <strong>72 horas</strong>.
              </p>

              <div style="display:flex;gap:12px;justify-content:center;">
                <a href="${approveUrl}" style="display:inline-block;background:#16a34a;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;margin:0 8px;">
                  ✅ APROVAR
                </a>
                <a href="${rejectUrl}" style="display:inline-block;background:#dc2626;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;margin:0 8px;">
                  ❌ RECUSAR
                </a>
              </div>

              <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:24px;">
                Se não reconhece esta solicitação, clique em Recusar.
              </p>
            </div>
          `
        })
      }

      await audit(sql, null, 'register_request', req, { name, email, username })
      return res.status(200).json({
        message: 'Solicitação enviada! Aguarde a aprovação do administrador. Você receberá um e-mail quando for aprovado.'
      })
    }

    // ══════════════════════════════════════════════════════════
    // AUTH — APROVAÇÃO / REJEIÇÃO (link do email)
    // ══════════════════════════════════════════════════════════
    if (url.startsWith('/auth/approve') && req.method === 'GET') {
      const urlObj = new URL(req.url, 'http://localhost')
      const token = urlObj.searchParams.get('token')
      const action = urlObj.searchParams.get('action') // 'approve' ou 'reject'

      if (!token || !['approve', 'reject'].includes(action)) {
        return res.status(400).send(htmlPage('Link Inválido', '❌ Link inválido ou malformado.', '#dc2626'))
      }

      const [pending] = await sql`
        SELECT * FROM "pendingRegistrations"
        WHERE "approvalToken" = ${token} AND status = 'pending'
        LIMIT 1
      `

      if (!pending) {
        return res.status(404).send(htmlPage('Link Expirado', '⏰ Este link já foi usado ou expirou.', '#f59e0b'))
      }

      if (new Date(pending.expiresAt) < new Date()) {
        await sql`UPDATE "pendingRegistrations" SET status = 'rejected' WHERE id = ${pending.id}`
        return res.status(410).send(htmlPage('Link Expirado', '⏰ Este link expirou. O usuário deve solicitar novo cadastro.', '#f59e0b'))
      }

      if (action === 'reject') {
        await sql`UPDATE "pendingRegistrations" SET status = 'rejected' WHERE id = ${pending.id}`

        // Notifica o usuário que foi recusado
        await sendEmail({
          to: pending.email,
          subject: 'Solicitação de cadastro recusada — Sistema IRPF/ITR',
          html: `
            <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
              <h2 style="color:#dc2626;">Solicitação Recusada</h2>
              <p>Olá <strong>${pending.name}</strong>,</p>
              <p>Sua solicitação de cadastro no Sistema IRPF/ITR foi <strong>recusada</strong> pelo administrador.</p>
              <p>Em caso de dúvidas, entre em contato com o administrador do sistema.</p>
            </div>
          `
        })

        await audit(sql, null, 'register_rejected', req, { pendingId: pending.id, email: pending.email })
        return res.status(200).send(htmlPage('Cadastro Recusado', `❌ O cadastro de <strong>${pending.name}</strong> foi recusado.`, '#dc2626'))
      }

      // APROVAR — cria o usuário
      const [newUser] = await sql`
        INSERT INTO users (username, password_hash, name, "displayName", email, role, "approvalStatus")
        VALUES (${pending.username}, ${pending.password_hash}, ${pending.name}, ${pending.name}, ${pending.email}, 'user', 'approved')
        ON CONFLICT (username) DO NOTHING
        RETURNING id, username, name, email, role
      `

      if (!newUser) {
        return res.status(409).send(htmlPage('Erro', '⚠️ Usuário já existe no sistema.', '#f59e0b'))
      }

      await sql`UPDATE "pendingRegistrations" SET status = 'approved' WHERE id = ${pending.id}`

      // Notifica o usuário aprovado
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}` || 'https://seusite.vercel.app'
      await sendEmail({
        to: pending.email,
        subject: '✅ Seu cadastro foi aprovado — Sistema IRPF/ITR',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#f8f9fa;padding:20px;border-radius:12px;">
            <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:24px;border-radius:8px;text-align:center;margin-bottom:20px;">
              <h1 style="color:white;margin:0;font-size:20px;">✅ Cadastro Aprovado!</h1>
            </div>
            <div style="background:white;padding:20px;border-radius:8px;border:1px solid #e2e8f0;">
              <p>Olá <strong>${pending.name}</strong>,</p>
              <p>Seu cadastro no <strong>Sistema IRPF/ITR</strong> foi aprovado!</p>
              <p>Você já pode acessar o sistema com:</p>
              <ul>
                <li><strong>Usuário:</strong> ${pending.username}</li>
                <li><strong>Senha:</strong> a que você escolheu no cadastro</li>
              </ul>
              <div style="text-align:center;margin-top:24px;">
                <a href="${appUrl}" style="background:#2563eb;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;">
                  Acessar Sistema
                </a>
              </div>
            </div>
          </div>
        `
      })

      await audit(sql, newUser.id, 'register_approved', req, { email: pending.email })
      return res.status(200).send(htmlPage('Cadastro Aprovado!', `✅ <strong>${pending.name}</strong> foi aprovado e já pode acessar o sistema.`, '#16a34a'))
    }

    // ══════════════════════════════════════════════════════════
    // AUTH — ME (dados do usuário logado)
    // ══════════════════════════════════════════════════════════
    if (url === '/auth/me' && req.method === 'GET') {
      const p = await auth(req, res); if (!p) return
      const [user] = await sql`SELECT id, username, name, "displayName", email, role, photo FROM users WHERE id = ${p.id} LIMIT 1`
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
      return res.status(200).json({ ...user, name: user.displayName || user.name })
    }

    // ══════════════════════════════════════════════════════════
    // AUTH — ATUALIZAR PERFIL
    // ══════════════════════════════════════════════════════════
    if (url === '/auth/profile' && req.method === 'PUT') {
      const p = await auth(req, res); if (!p) return
      const { name, email, photo } = req.body || {}

      // Se mudou a senha
      if (req.body?.newPassword) {
        if (!req.body.currentPassword) return res.status(400).json({ error: 'Senha atual obrigatória' })
        if (req.body.newPassword.length < 8) return res.status(400).json({ error: 'Nova senha mínimo 8 caracteres' })
        const [u] = await sql`SELECT password_hash FROM users WHERE id = ${p.id}`
        if (!await bcrypt.compare(req.body.currentPassword, u.password_hash))
          return res.status(400).json({ error: 'Senha atual incorreta' })
        const newHash = await bcrypt.hash(req.body.newPassword, 12)
        await sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${p.id}`
        await audit(sql, p.id, 'password_changed', req)
      }

      const oldUser = await sql`SELECT "displayName", name FROM users WHERE id = ${p.id} LIMIT 1`
      const oldName = oldUser[0]?.displayName || oldUser[0]?.name

      const [updated] = await sql`
        UPDATE users SET
          "displayName" = COALESCE(${name?.trim() || null}, "displayName"),
          email = COALESCE(${email?.trim() || null}, email),
          photo = COALESCE(${photo || null}, photo),
          "updatedAt" = NOW()
        WHERE id = ${p.id}
        RETURNING id, username, name, "displayName", email, role, photo
      `

      // Sincroniza nome no collaborators
      const oldNameValue = oldUser[0]?.displayName || oldUser[0]?.name
      if (name?.trim() && oldNameValue && oldNameValue !== name.trim()) {
        await sql`UPDATE collaborators SET name = ${name.trim()} WHERE name = ${oldNameValue}`
      }

      // Sincroniza foto no collaborators para aparecer nos lancamentos
      if (photo !== undefined) {
        const currentName = name?.trim() || oldNameValue
        if (currentName) {
          await sql`UPDATE collaborators SET photo = ${photo || null} WHERE name = ${currentName}`
        }
      }

      await audit(sql, p.id, 'profile_updated', req)
      return res.status(200).json({ ...updated, name: updated.displayName || updated.name })
    }

    // ══════════════════════════════════════════════════════════
    // ADMIN — Lista pendentes
    // ══════════════════════════════════════════════════════════
    if (url === '/admin/pending' && req.method === 'GET') {
      const p = await auth(req, res); if (!p) return
      if (p.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' })
      const rows = await sql`
        SELECT id, name, email, username, "requestedAt", status
        FROM "pendingRegistrations"
        WHERE status = 'pending' AND "expiresAt" > NOW()
        ORDER BY "requestedAt" DESC
      `
      return res.status(200).json(rows)
    }

    // ══════════════════════════════════════════════════════════
    // A PARTIR DAQUI — requer autenticação
    // ══════════════════════════════════════════════════════════
    const p = await auth(req, res); if (!p) return

    // DADOS COMPARTILHADOS: todos usam o userId do ADMIN
    // Busca o userId do admin para usar em todas as queries
    const [adminRow] = await sql`SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1`
    if (!adminRow) return res.status(500).json({ error: 'Admin não encontrado' })
    const sharedUserId = adminRow.id // todos veem os dados do admin

    async function getSettings() {
      const r = await sql`SELECT * FROM settings WHERE "userId" = ${sharedUserId} LIMIT 1`
      return r[0] || {
        percentualDiversos: 10, valorFixoSocio: 500,
        percentualDiversosIRPF: 10, valorFixoSocioIRPF: 500,
        percentualDiversosITR: 10, valorFixoSocioITR: 500
      }
    }

    // ─── DECLARATIONS IRPF ────────────────────────────────────
    if (url.startsWith('/declarations')) {
      const idMatch = url.match(/\/declarations\/(\d+)$/)
      const isAll = url.includes('/declarations/all')

      if (isAll && req.method === 'DELETE') {
        await sql`DELETE FROM declarations WHERE "userId" = ${sharedUserId} AND month = ${req.query?.month}`
        return res.status(200).json({ success: true })
      }
      if (idMatch) {
        const id = parseInt(idMatch[1])
        const [own] = await sql`SELECT id FROM declarations WHERE id = ${id} AND "userId" = ${sharedUserId} LIMIT 1`
        if (!own) return res.status(404).json({ error: 'Não encontrado' })
        if (req.method === 'PUT') {
          const { collaborator, cpfCliente, cliente, valorRecebido, clienteType, statusPagamento, paymentMonth } = req.body || {}
          const [cur] = await sql`SELECT * FROM declarations WHERE id = ${id} LIMIT 1`
          const s = await getSettings()
          const nv = valorRecebido ?? cur.valorRecebido
          const nt = clienteType ?? cur.clienteType
          const ns = statusPagamento ?? cur.statusPagamento
          const npm = paymentMonth ?? cur.paymentMonth
          const pct = s.percentualDiversosIRPF ?? s.percentualDiversos
          const fixo = s.valorFixoSocioIRPF ?? s.valorFixoSocio
          const comissao = ns === 'PAGO' ? calcComissao(nv, nt, ns, pct, fixo) : 0
          const [u] = await sql`UPDATE declarations SET
            collaborator = COALESCE(${collaborator || null}, collaborator),
            "cpfCliente" = COALESCE(${cpfCliente ?? null}, "cpfCliente"),
            cliente = COALESCE(${cliente || null}, cliente),
            "valorRecebido" = ${nv},
            "clienteType" = ${nt},
            "statusPagamento" = ${ns},
            comissao = ${comissao},
            "paymentMonth" = ${ns === 'PAGO' ? (npm || cur.month) : null},
            "updatedAt" = NOW()
            WHERE id = ${id} RETURNING *`
          return res.status(200).json(u)
        }
        if (req.method === 'DELETE') {
          await sql`DELETE FROM declarations WHERE id = ${id}`
          return res.status(200).json({ success: true })
        }
      }
      if (req.method === 'GET') {
        const month = new URL(req.url, 'http://x').searchParams.get('month')
        const rows = await sql`SELECT * FROM declarations WHERE "userId" = ${sharedUserId} AND month = ${month} ORDER BY "createdAt" DESC`
        return res.status(200).json(rows)
      }
      if (req.method === 'POST') {
        const { month, collaborator, cpfCliente, cliente, valorRecebido, clienteType, statusPagamento, paymentMonth } = req.body || {}
        const s = await getSettings()
        const pct = s.percentualDiversosIRPF ?? s.percentualDiversos
        const fixo = s.valorFixoSocioIRPF ?? s.valorFixoSocio
        const comissao = statusPagamento === 'PAGO' ? calcComissao(valorRecebido, clienteType, statusPagamento, pct, fixo) : 0
        const pm = statusPagamento === 'PAGO' ? (paymentMonth || month) : null
        const [row] = await sql`INSERT INTO declarations ("userId", month, collaborator, "cpfCliente", cliente, "valorRecebido", "clienteType", comissao, "statusPagamento", "paymentMonth")
          VALUES (${sharedUserId}, ${month}, ${collaborator}, ${cpfCliente || null}, ${cliente}, ${valorRecebido}, ${clienteType}, ${comissao}, ${statusPagamento}, ${pm}) RETURNING *`
        return res.status(201).json(row)
      }
    }

    // ─── DECLARATIONS ITR ─────────────────────────────────────
    if (url.startsWith('/itr')) {
      const idMatch = url.match(/\/itr\/(\d+)$/)
      const isAll = url.includes('/itr/all')

      if (isAll && req.method === 'DELETE') {
        await sql`DELETE FROM "itrDeclarations" WHERE "userId" = ${sharedUserId} AND month = ${new URL(req.url, 'http://x').searchParams.get('month')}`
        return res.status(200).json({ success: true })
      }
      if (idMatch) {
        const id = parseInt(idMatch[1])
        const [own] = await sql`SELECT id FROM "itrDeclarations" WHERE id = ${id} AND "userId" = ${sharedUserId} LIMIT 1`
        if (!own) return res.status(404).json({ error: 'Não encontrado' })
        if (req.method === 'PUT') {
          const { collaborator, cpfCliente, cliente, valorRecebido, clienteType, statusPagamento, paymentMonth } = req.body || {}
          const [cur] = await sql`SELECT * FROM "itrDeclarations" WHERE id = ${id} LIMIT 1`
          const s = await getSettings()
          const nv = valorRecebido ?? cur.valorRecebido
          const nt = clienteType ?? cur.clienteType
          const ns = statusPagamento ?? cur.statusPagamento
          const npm = paymentMonth ?? cur.paymentMonth
          const pct = s.percentualDiversosITR ?? s.percentualDiversos
          const fixo = s.valorFixoSocioITR ?? s.valorFixoSocio
          const comissao = ns === 'PAGO' ? calcComissao(nv, nt, ns, pct, fixo) : 0
          const [u] = await sql`UPDATE "itrDeclarations" SET
            collaborator = COALESCE(${collaborator || null}, collaborator),
            "cpfCliente" = COALESCE(${cpfCliente ?? null}, "cpfCliente"),
            cliente = COALESCE(${cliente || null}, cliente),
            "valorRecebido" = ${nv},
            "clienteType" = ${nt},
            "statusPagamento" = ${ns},
            comissao = ${comissao},
            "paymentMonth" = ${ns === 'PAGO' ? (npm || cur.month) : null},
            "updatedAt" = NOW()
            WHERE id = ${id} RETURNING *`
          return res.status(200).json(u)
        }
        if (req.method === 'DELETE') {
          await sql`DELETE FROM "itrDeclarations" WHERE id = ${id}`
          return res.status(200).json({ success: true })
        }
      }
      if (req.method === 'GET') {
        const month = new URL(req.url, 'http://x').searchParams.get('month')
        const rows = await sql`SELECT * FROM "itrDeclarations" WHERE "userId" = ${sharedUserId} AND month = ${month} ORDER BY "createdAt" DESC`
        return res.status(200).json(rows)
      }
      if (req.method === 'POST') {
        const { month, collaborator, cpfCliente, cliente, valorRecebido, clienteType, statusPagamento, paymentMonth } = req.body || {}
        const s = await getSettings()
        const pct = s.percentualDiversosITR ?? s.percentualDiversos
        const fixo = s.valorFixoSocioITR ?? s.valorFixoSocio
        const comissao = statusPagamento === 'PAGO' ? calcComissao(valorRecebido, clienteType, statusPagamento, pct, fixo) : 0
        const pm = statusPagamento === 'PAGO' ? (paymentMonth || month) : null
        const [row] = await sql`INSERT INTO "itrDeclarations" ("userId", month, collaborator, "cpfCliente", cliente, "valorRecebido", "clienteType", comissao, "statusPagamento", "paymentMonth")
          VALUES (${sharedUserId}, ${month}, ${collaborator}, ${cpfCliente || null}, ${cliente}, ${valorRecebido}, ${clienteType}, ${comissao}, ${statusPagamento}, ${pm}) RETURNING *`
        return res.status(201).json(row)
      }
    }

    // ─── COLLABORATORS ────────────────────────────────────────
    if (url.startsWith('/collaborators')) {
      const idMatch = url.match(/\/collaborators\/(\d+)$/)
      if (idMatch) {
        const id = parseInt(idMatch[1])
        if (req.method === 'DELETE') {
          await sql`DELETE FROM collaborators WHERE id = ${id} AND "userId" = ${sharedUserId}`
          return res.status(200).json({ success: true })
        }
        if (req.method === 'PUT') {
          const { photo } = req.body || {}
          const [u] = await sql`UPDATE collaborators SET photo = ${photo || null} WHERE id = ${id} AND "userId" = ${sharedUserId} RETURNING *`
          return res.status(200).json(u)
        }
      }
      if (req.method === 'GET') {
        const rows = await sql`
          SELECT
            c.*,
            COALESCE(c.photo, u.photo) AS photo
          FROM collaborators c
          LEFT JOIN users u ON (u."displayName" = c.name OR u.name = c.name)
          WHERE c."userId" = ${sharedUserId}
          ORDER BY c.name ASC
        `
        return res.status(200).json(rows)
      }
      if (req.method === 'POST') {
        const { name } = req.body || {}
        if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatório' })
        try {
          const [row] = await sql`INSERT INTO collaborators ("userId", name) VALUES (${sharedUserId}, ${name.trim()}) RETURNING *`
          return res.status(201).json(row)
        } catch (e) {
          if (e.code === '23505') return res.status(409).json({ error: 'Colaborador já existe' })
          throw e
        }
      }
    }

    // ─── SETTINGS ─────────────────────────────────────────────
    if (url === '/settings') {
      if (req.method === 'GET') return res.status(200).json(await getSettings())
      if (req.method === 'PUT') {
        if (p.role !== 'admin') return res.status(403).json({ error: 'Apenas o admin pode alterar precificações' })
        const { percentualDiversos, valorFixoSocio, percentualDiversosIRPF, valorFixoSocioIRPF, percentualDiversosITR, valorFixoSocioITR } = req.body || {}
        const [row] = await sql`
          INSERT INTO settings ("userId", "percentualDiversos", "valorFixoSocio", "percentualDiversosIRPF", "valorFixoSocioIRPF", "percentualDiversosITR", "valorFixoSocioITR")
          VALUES (${sharedUserId}, ${percentualDiversos ?? 10}, ${valorFixoSocio ?? 500}, ${percentualDiversosIRPF ?? 10}, ${valorFixoSocioIRPF ?? 500}, ${percentualDiversosITR ?? 10}, ${valorFixoSocioITR ?? 500})
          ON CONFLICT ("userId") DO UPDATE SET
            "percentualDiversos" = COALESCE(${percentualDiversos ?? null}, settings."percentualDiversos"),
            "valorFixoSocio" = COALESCE(${valorFixoSocio ?? null}, settings."valorFixoSocio"),
            "percentualDiversosIRPF" = COALESCE(${percentualDiversosIRPF ?? null}, settings."percentualDiversosIRPF"),
            "valorFixoSocioIRPF" = COALESCE(${valorFixoSocioIRPF ?? null}, settings."valorFixoSocioIRPF"),
            "percentualDiversosITR" = COALESCE(${percentualDiversosITR ?? null}, settings."percentualDiversosITR"),
            "valorFixoSocioITR" = COALESCE(${valorFixoSocioITR ?? null}, settings."valorFixoSocioITR"),
            "updatedAt" = NOW()
          RETURNING *`
        return res.status(200).json(row)
      }
    }

    // ─── COMMISSIONS ──────────────────────────────────────────
    if (url === '/commissions' || url === '/commissions/itr') {
      const isItr = url.includes('/itr')
      const data = isItr
        ? await sql`SELECT collaborator, month, "paymentMonth", "valorRecebido", "statusPagamento", comissao FROM "itrDeclarations" WHERE "userId" = ${sharedUserId}`
        : await sql`SELECT collaborator, month, "paymentMonth", "valorRecebido", "statusPagamento", comissao FROM declarations WHERE "userId" = ${sharedUserId}`
      const map = {}
      for (const d of data) {
        if (!map[d.collaborator]) map[d.collaborator] = { collaborator: d.collaborator, months: {} }
        const comMonth = d.statusPagamento === 'PAGO' && d.paymentMonth ? d.paymentMonth : d.month
        if (!map[d.collaborator].months[d.month]) map[d.collaborator].months[d.month] = { vendas: 0, recebido: 0, comissao: 0, aguardando: 0 }
        map[d.collaborator].months[d.month].vendas++
        map[d.collaborator].months[d.month].recebido += d.valorRecebido || 0
        if (d.statusPagamento === 'AGUARDANDO') map[d.collaborator].months[d.month].aguardando++
        if (d.statusPagamento === 'PAGO') {
          if (!map[d.collaborator].months[comMonth]) map[d.collaborator].months[comMonth] = { vendas: 0, recebido: 0, comissao: 0, aguardando: 0 }
          map[d.collaborator].months[comMonth].comissao += d.comissao || 0
        }
      }
      return res.status(200).json(Object.values(map))
    }

    // ─── QUOTAS ───────────────────────────────────────────────
    if (url.startsWith('/quotas')) {
      const idMatch = url.match(/\/quotas\/(\d+)$/)
      if (idMatch) {
        const id = parseInt(idMatch[1])
        const [own] = await sql`SELECT id FROM quotas WHERE id = ${id} AND "userId" = ${sharedUserId} LIMIT 1`
        if (!own) return res.status(404).json({ error: 'Não encontrado' })
        if (req.method === 'PUT') {
          const { cotasEnviadas, collaborator, cliente, quantidadeCotas, meioEnvio } = req.body || {}
          const [u] = await sql`UPDATE quotas SET
            "cotasEnviadas" = COALESCE(${cotasEnviadas ?? null}, "cotasEnviadas"),
            collaborator = COALESCE(${collaborator || null}, collaborator),
            cliente = COALESCE(${cliente || null}, cliente),
            "quantidadeCotas" = COALESCE(${quantidadeCotas ?? null}, "quantidadeCotas"),
            "meioEnvio" = COALESCE(${meioEnvio || null}, "meioEnvio"),
            "updatedAt" = NOW()
            WHERE id = ${id} RETURNING *`
          return res.status(200).json(u)
        }
        if (req.method === 'DELETE') {
          await sql`DELETE FROM quotas WHERE id = ${id}`
          return res.status(200).json({ success: true })
        }
      }
      if (req.method === 'GET') {
        const rows = await sql`SELECT * FROM quotas WHERE "userId" = ${sharedUserId} ORDER BY "createdAt" DESC`
        return res.status(200).json(rows)
      }
      if (req.method === 'POST') {
        const { collaborator, cliente, quantidadeCotas, cotasEnviadas, meioEnvio } = req.body || {}
        const [row] = await sql`INSERT INTO quotas ("userId", collaborator, cliente, "quantidadeCotas", "cotasEnviadas", "meioEnvio")
          VALUES (${sharedUserId}, ${collaborator}, ${cliente}, ${quantidadeCotas}, ${cotasEnviadas || 0}, ${meioEnvio}) RETURNING *`
        return res.status(201).json(row)
      }
    }

    // ─── DASHBOARD ────────────────────────────────────────────
    if (url === '/dashboard' && req.method === 'GET') {
      const irpfMonths = ['Março', 'Abril', 'Maio']
      const itrMonths = ['Agosto', 'Setembro']
      const [irpfAll, itrAll, collabs, settings] = await Promise.all([
        sql`SELECT * FROM declarations WHERE "userId" = ${sharedUserId}`,
        sql`SELECT * FROM "itrDeclarations" WHERE "userId" = ${sharedUserId}`,
        sql`SELECT * FROM collaborators WHERE "userId" = ${sharedUserId}`,
        getSettings()
      ])
      const irpfPago = irpfAll.filter(d => d.statusPagamento === 'PAGO')
      const itrPago = itrAll.filter(d => d.statusPagamento === 'PAGO')
      const irpfByMonth = {}
      for (const m of irpfMonths) {
        const md = irpfAll.filter(d => d.month === m)
        irpfByMonth[m] = { total: md.length, recebido: md.reduce((s, d) => s + (d.valorRecebido || 0), 0), comissao: md.filter(d => d.statusPagamento === 'PAGO').reduce((s, d) => s + (d.comissao || 0), 0) }
      }
      const itrByMonth = {}
      for (const m of itrMonths) {
        const md = itrAll.filter(d => d.month === m)
        itrByMonth[m] = { total: md.length, recebido: md.reduce((s, d) => s + (d.valorRecebido || 0), 0), comissao: md.filter(d => d.statusPagamento === 'PAGO').reduce((s, d) => s + (d.comissao || 0), 0) }
      }
      const collabMap = {}
      for (const d of [...irpfPago, ...itrPago]) {
        if (!collabMap[d.collaborator]) collabMap[d.collaborator] = { name: d.collaborator, comissao: 0, vendas: 0 }
        collabMap[d.collaborator].comissao += d.comissao || 0
        collabMap[d.collaborator].vendas++
      }
      return res.status(200).json({
        totalColaboradores: collabs.length,
        irpf: {
          total: irpfAll.length, pago: irpfPago.length,
          aguardando: irpfAll.filter(d => d.statusPagamento === 'AGUARDANDO').length,
          recebidoTotal: irpfAll.reduce((s, d) => s + (d.valorRecebido || 0), 0),
          recebidoPago: irpfPago.reduce((s, d) => s + (d.valorRecebido || 0), 0),
          comissaoTotal: irpfPago.reduce((s, d) => s + (d.comissao || 0), 0),
          byMonth: irpfByMonth,
        },
        itr: {
          total: itrAll.length, pago: itrPago.length,
          aguardando: itrAll.filter(d => d.statusPagamento === 'AGUARDANDO').length,
          recebidoTotal: itrAll.reduce((s, d) => s + (d.valorRecebido || 0), 0),
          recebidoPago: itrPago.reduce((s, d) => s + (d.valorRecebido || 0), 0),
          comissaoTotal: itrPago.reduce((s, d) => s + (d.comissao || 0), 0),
          byMonth: itrByMonth,
        },
        topCollaboradores: Object.values(collabMap).sort((a, b) => b.comissao - a.comissao).slice(0, 5),
        settings,
      })
    }

    // ─── IMPORT / EXPORT ──────────────────────────────────────
    if (url === '/import' && req.method === 'POST') {
      if (p.role !== 'admin') return res.status(403).json({ error: 'Apenas admin pode importar' })
      const { declarations, collaborators } = req.body || {}
      const s = await getSettings()
      for (const name of (collaborators || [])) {
        await sql`INSERT INTO collaborators ("userId", name) VALUES (${sharedUserId}, ${name}) ON CONFLICT DO NOTHING`
      }
      let imported = 0
      const errors = []
      for (const row of (declarations || [])) {
        try {
          const { collaborator, cliente, cpfCliente, valorRecebido, clienteType, statusPagamento, month, categoria } = row
          if (!collaborator || !cliente || !month) continue
          const isItr = (categoria || 'IRPF').toUpperCase() === 'ITR'
          const pct = isItr ? (s.percentualDiversosITR ?? s.percentualDiversos) : (s.percentualDiversosIRPF ?? s.percentualDiversos)
          const fixo = isItr ? (s.valorFixoSocioITR ?? s.valorFixoSocio) : (s.valorFixoSocioIRPF ?? s.valorFixoSocio)
          const comissao = statusPagamento === 'PAGO' ? calcComissao(valorRecebido || 0, clienteType || 'Diversos', statusPagamento || 'AGUARDANDO', pct, fixo) : 0
          if (isItr) {
            await sql`INSERT INTO "itrDeclarations" ("userId", month, collaborator, "cpfCliente", cliente, "valorRecebido", "clienteType", comissao, "statusPagamento") VALUES (${sharedUserId}, ${month}, ${collaborator}, ${cpfCliente || null}, ${cliente}, ${valorRecebido || 0}, ${clienteType || 'Diversos'}, ${comissao}, ${statusPagamento || 'AGUARDANDO'})`
          } else {
            await sql`INSERT INTO declarations ("userId", month, collaborator, "cpfCliente", cliente, "valorRecebido", "clienteType", comissao, "statusPagamento") VALUES (${sharedUserId}, ${month}, ${collaborator}, ${cpfCliente || null}, ${cliente}, ${valorRecebido || 0}, ${clienteType || 'Diversos'}, ${comissao}, ${statusPagamento || 'AGUARDANDO'})`
          }
          imported++
        } catch (e) { errors.push(`Linha ${imported + errors.length + 1}: ${e.message}`) }
      }
      return res.status(200).json({ imported, errors })
    }

    if (url === '/export' && req.method === 'GET') {
      const irpf = {}
      for (const m of ['Março', 'Abril', 'Maio']) irpf[m] = await sql`SELECT * FROM declarations WHERE "userId" = ${sharedUserId} AND month = ${m} ORDER BY collaborator`
      const itr = {}
      for (const m of ['Agosto', 'Setembro']) itr[m] = await sql`SELECT * FROM "itrDeclarations" WHERE "userId" = ${sharedUserId} AND month = ${m} ORDER BY collaborator`
      const all = [...Object.values(irpf).flat(), ...Object.values(itr).flat()]
      const cm = {}
      for (const d of all) {
        if (!cm[d.collaborator]) cm[d.collaborator] = { collaborator: d.collaborator, totalVendas: 0, totalRecebido: 0, totalComissao: 0 }
        cm[d.collaborator].totalVendas++
        cm[d.collaborator].totalRecebido += d.valorRecebido || 0
        if (d.statusPagamento === 'PAGO') cm[d.collaborator].totalComissao += d.comissao || 0
      }
      return res.status(200).json({ irpf, itr, commissions: Object.values(cm) })
    }

    res.status(404).json({ error: 'Rota não encontrada' })

  } catch (err) {
    console.error('[API Error]', err)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

// ─── Helper: página HTML para aprovação/rejeição ─────────────
function htmlPage(title, message, color) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Sistema IRPF/ITR</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .card { background: white; border-radius: 16px; padding: 48px; text-align: center; max-width: 480px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.1); }
    .icon { font-size: 56px; margin-bottom: 20px; }
    h1 { color: ${color}; font-size: 24px; margin-bottom: 12px; }
    p { color: #64748b; font-size: 15px; line-height: 1.6; }
    .btn { display: inline-block; margin-top: 28px; padding: 12px 28px; background: #2563eb; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${color === '#16a34a' ? '✅' : color === '#dc2626' ? '❌' : '⏰'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/" class="btn">Ir para o Sistema</a>
  </div>
</body>
</html>`
}