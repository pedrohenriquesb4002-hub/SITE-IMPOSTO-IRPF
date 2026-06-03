# IRPF/ITR — Sistema de Gestão

Sistema completo para gestão de declarações IRPF e ITR com autenticação segura, comissões automáticas e importação/exportação de planilhas Excel.

---

## 🚀 Setup na Vercel (passo a passo)

### 1. Prepare o banco de dados no Neon

1. Acesse [neon.tech](https://neon.tech) e faça login
2. Crie um novo projeto (ou use o existente)
3. Vá em **SQL Editor** e cole e execute o conteúdo do arquivo `schema.sql`
4. Copie a **Connection String** do seu projeto (em Connection Details)

### 2. Configure variáveis de ambiente na Vercel

No painel da Vercel, vá em **Settings → Environment Variables** e adicione:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | Connection string do Neon (com `?sslmode=require`) |
| `JWT_SECRET` | Texto aleatório forte (min. 32 caracteres) |
| `REGISTRATION_SECRET` | Outro texto aleatório (para criar novos usuários) |

> Para gerar um segredo: `openssl rand -base64 32`

### 3. Faça o deploy

**Opção A — GitHub (recomendado):**
1. Faça upload do projeto para um repositório no GitHub
2. Na Vercel, clique em **Add New Project** → importe o repositório
3. Clique em **Deploy**

**Opção B — Vercel CLI:**
```bash
npm i -g vercel
vercel login
vercel --prod
```

### 4. Crie seu usuário admin

Após o deploy, crie o primeiro usuário admin com:

```bash
curl -X POST https://SEU-SITE.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"SuaSenhaForte123","name":"Administrador"}'
```

> O primeiro cadastro sempre vira admin automaticamente.

Para adicionar mais usuários depois:
```bash
curl -X POST https://SEU-SITE.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -H "X-Registration-Secret: seu-REGISTRATION_SECRET" \
  -d '{"username":"novo","password":"Senha123","name":"Novo Usuário"}'
```

---

## 🔄 Como substituir o código antigo na Vercel

Se você já tem o site antigo na Vercel, siga estes passos:

### Via GitHub (método mais fácil)
1. Acesse o repositório do site antigo no GitHub
2. **Delete todos os arquivos** do repositório (ou crie uma nova branch `main`)
3. Faça upload de todos os arquivos desta pasta para o repositório
4. A Vercel vai fazer o redeploy automaticamente

### Via Vercel CLI (direto)
```bash
# Na pasta deste projeto
npm install
vercel link         # vincula ao projeto existente na Vercel
vercel --prod       # faz o deploy sobrescrevendo o anterior
```

---

## 💻 Desenvolvimento local

```bash
npm install
cp .env.example .env.local
# Edite .env.local com suas variáveis
npm run dev
```

---

## 📁 Estrutura do projeto

```
├── api/                  # Serverless functions (Vercel)
│   ├── auth/             # Login, registro, me
│   ├── declarations/     # CRUD declarações IRPF
│   ├── itr/              # CRUD declarações ITR
│   ├── collaborators/    # Gestão de colaboradores
│   ├── commissions/      # Cálculo de comissões
│   ├── quotas/           # Gestão de cotas
│   ├── import.js         # Importação de planilhas
│   ├── export.js         # Exportação de planilhas
│   └── settings.js       # Configurações de comissão
├── src/                  # Frontend React
│   ├── app/
│   │   ├── components/   # Páginas do dashboard
│   │   └── pages/        # LoginPage
│   ├── lib/              # Store, API client, utilitários
│   └── styles/           # CSS/Tailwind
├── schema.sql            # SQL para o Neon
├── vercel.json           # Configuração da Vercel
└── .env.example          # Variáveis de ambiente necessárias
```

---

## 🔐 Segurança implementada

- ✅ Autenticação JWT com expiração de 8h
- ✅ Senhas com bcrypt (custo 12)
- ✅ Todas as rotas da API exigem token válido
- ✅ Isolamento de dados por usuário (userId em todas as queries)
- ✅ Headers de segurança (X-Frame-Options, XSS-Protection, etc.)
- ✅ Primeiro registro automático vira admin
- ✅ Registro posterior protegido por REGISTRATION_SECRET
