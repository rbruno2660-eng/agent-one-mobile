# CLAUDE.md — Agent One Mobile Store

## O que é este projeto
Agent One para loja de iPhones: WhatsApp AI agent multi-tenant que atende, qualifica e vende. O agente nunca inventa dados — consulta sempre o banco via tools.

## Stack
- Backend: Node.js + Express + PostgreSQL (Railway)
- Frontend/Painel: Next.js (Vercel)
- Agent Runtime: Claude API (Anthropic)
- WhatsApp: Meta Business Platform (webhooks)
- Fila: Bull + Redis
- Auth: JWT + refresh token

## Comandos
```bash
# Backend
cd backend
npm install
npm run dev         # nodemon
npm run migrate     # rodar migrations
npm run seed        # seed inicial

# Frontend
cd frontend
npm install
npm run dev         # Next.js dev server
npm run build
```

## Regras críticas de negócio
1. A IA nunca calcula preço — usa tool `get_product_price`
2. Preço mínimo é validado no backend (check_discount), nunca só no frontend
3. Produto com estoque 0 não pode ser ofertado
4. Webhook WhatsApp: idempotência por provider_id (não processar duplicata)
5. Tenant isolation: tenant_id obrigatório em todas as queries
6. Handoff imediato quando cliente pede humano (estado HUMAN_REQUESTED)
7. Tool calls sempre logadas em tool_calls com input/output/duração

## Multi-tenant
- Toda tabela tem tenant_id
- Middleware de tenant extrai do JWT e injeta nas queries
- Nunca fazer query sem WHERE tenant_id = ?

## Auditoria
- Alterações de preço, estoque, regras de troca e prompt → audit_logs com before/after
- Usar helper `auditLog(tenantId, actor, action, entity, entityId, before, after)`

## Estrutura de pasta backend/src
- `routes/` — só define endpoints, chama services
- `services/` — lógica de negócio, sem HTTP
- `agents/` — Agent Runtime: monta prompt, chama Claude, executa tools
- `tools/` — implementação de cada tool (get_product_price, check_stock, etc.)
- `middleware/` — auth, rbac, tenant, rateLimit
- `db/` — pool, migrations, seeds, query helpers
