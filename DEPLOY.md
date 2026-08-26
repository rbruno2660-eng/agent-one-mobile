# Deploy Guide — Agent One Mobile Store

## Stack em produção
- **Backend**: Railway (Node.js + PostgreSQL + Redis)
- **Frontend**: Vercel (Next.js)
- **Webhook WhatsApp**: URL pública do Railway

---

## 1. Backend no Railway

### Pré-requisitos
- Conta no [railway.app](https://railway.app)
- CLI: `npm install -g @railway/cli`

### Passo a passo

```bash
# 1. Login
railway login

# 2. Novo projeto
railway init

# 3. Adicionar PostgreSQL
railway add --plugin postgresql

# 4. Adicionar Redis
railway add --plugin redis

# 5. Deployar backend (pasta /backend)
cd backend
railway up

# 6. Setar variáveis de ambiente
# Cole cada linha do .env.production.example no painel Railway → Variables
# OU use o CLI:
railway variables set JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
railway variables set ANTHROPIC_API_KEY=sk-ant-...
# ... etc

# 7. Rodar migrate + seed
railway run node src/db/migrate.js
railway run node src/db/seed.js
```

### Variáveis obrigatórias no Railway
Copie `.env.production.example` e preencha todas as variáveis marcadas.

---

## 2. Frontend no Vercel

```bash
cd frontend

# 1. Login
npx vercel login

# 2. Deploy
npx vercel --prod

# 3. Setar variável de ambiente no Vercel dashboard:
#    NEXT_PUBLIC_API_URL = https://SEU-PROJETO.railway.app
```

---

## 3. WhatsApp Business — Configurar Webhook

1. Acesse **Meta for Developers** → seu app → WhatsApp → Configuration
2. **Callback URL**: `https://SEU-PROJETO.railway.app/webhooks/whatsapp`
3. **Verify token**: o valor de `WHATSAPP_VERIFY_TOKEN` no Railway
4. Assinar os campos: `messages`, `message_deliveries`, `message_reads`
5. Clicar **Verify and save**

---

## 4. Checklist de Go-Live

- [ ] `DATABASE_URL` apontando para PostgreSQL Railway
- [ ] `REDIS_URL` apontando para Redis Railway
- [ ] `JWT_SECRET` e `JWT_REFRESH_SECRET` com 64 bytes aleatórios
- [ ] `ANTHROPIC_API_KEY` válida
- [ ] `WHATSAPP_TOKEN` com token permanente (não temporário)
- [ ] `WHATSAPP_APP_SECRET` correto
- [ ] Webhook verificado no Meta
- [ ] Frontend deployado com `NEXT_PUBLIC_API_URL` correto
- [ ] CORS no backend liberado para a URL do Vercel (`FRONTEND_URL`)
- [ ] SSL ativo no Railway (automático)
- [ ] `/health` respondendo 200

---

## 5. Primeiro login

```
URL:   https://agent-one.vercel.app/login
Email: admin@loja.com
Senha: Admin@2025
```

**Troque a senha imediatamente** em Settings → Equipe.

---

## 6. Rollback

```bash
# Ver deploys anteriores
railway deployments

# Rollback para deploy anterior
railway rollback [deployment-id]
```
