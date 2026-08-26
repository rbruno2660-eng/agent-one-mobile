# AGENT ONE — Mobile Store
## Roadmap Técnico de Implementação

> **Visão:** WhatsApp AI Agent para loja de iPhones. O empresário atualiza preço/estoque no painel; o agente consulta e responde corretamente no WhatsApp.

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Backend API | Node.js + Express |
| Banco de Dados | PostgreSQL (Railway) |
| Frontend/Painel | Next.js (Vercel) |
| Agent Runtime | Claude API (Anthropic) |
| WhatsApp | Meta Business Platform (webhooks) |
| Fila de mensagens | Bull/Redis (Railway) |
| Auth | JWT + refresh tokens |
| Storage | Cloudflare R2 ou AWS S3 |

---

## Sprint 0 — Discovery + Dados Reais
**Objetivo:** Levantar todos os dados reais da loja antes de escrever uma linha de código.

### Checklist
- [ ] Listar todos os modelos de iPhone vendidos (novo e seminovo)
- [ ] Levantar preço tabela, preço atual e preço mínimo por produto
- [ ] Definir tabela de parcelamento (número de parcelas + valor ou taxa)
- [ ] Levantar valor base de troca por modelo
- [ ] Definir descontos de troca: bateria, tela, traseira, carcaça
- [ ] Listar serviços de manutenção com preço, mínimo, prazo e garantia
- [ ] Listar acessórios com preço e estoque
- [ ] Definir políticas: garantia, troca, devolução
- [ ] Definir horários, endereço, forma de retirada/entrega
- [ ] Listar usuários e funções (owner, admin, seller, service)
- [ ] Criar conta Meta Business e número WhatsApp Business
- [ ] Criar conta Railway, Vercel e Anthropic

**Entrega:** Planilha com dados reais + credenciais configuradas.

---

## Sprint 1 — Fundação: Auth, Tenant, Banco
**Objetivo:** Estrutura multi-tenant funcionando com autenticação e banco criado.

### Backend
- [ ] Criar projeto Node.js/Express com estrutura de pastas
- [ ] Configurar PostgreSQL no Railway
- [ ] Criar schema completo (todas as tabelas do blueprint)
- [ ] Implementar isolamento multi-tenant (tenant_id em todas as tabelas)
- [ ] Criar migrations com rollback
- [ ] Implementar Auth: POST /auth/login, refresh token, middleware JWT
- [ ] Implementar RBAC: owner, admin, manager, seller, service, viewer
- [ ] Criar seed: tenant inicial + usuário owner
- [ ] Criar audit_logs automático (trigger ou middleware)

### Frontend
- [ ] Criar projeto Next.js
- [ ] Tela de Login (email + senha)
- [ ] Tela de Onboarding (empresa, nicho, dados básicos)
- [ ] Tela de Equipe (usuários e permissões)
- [ ] Rota protegida por role

### Infra
- [ ] Deploy backend no Railway (env vars configuradas)
- [ ] Deploy frontend no Vercel
- [ ] Variáveis de ambiente documentadas no `.env.example`

**Definition of Done:** Login funcionando, tenant isolado, RBAC aplicado.

---

## Sprint 2 — Catálogo, Estoque e Preços
**Objetivo:** O painel permite cadastrar produtos com preço e estoque. O agente terá dados para consultar.

### Backend
- [ ] CRUD de produtos (iPhone novo/seminovo)
- [ ] Campos: categoria, modelo, variante, armazenamento, cor, condição, saúde da bateria
- [ ] CRUD de estoque (quantity, reserved)
- [ ] CRUD de price_books e product_prices (tabela, atual, mínimo)
- [ ] CRUD de installments (parcelas por produto)
- [ ] GET /products/:id/price — retorna preço + parcelas por forma de pagamento
- [ ] PATCH /inventory/:productId — atualiza estoque + audit
- [ ] Importação via CSV/XLSX com preview, validação e rollback
- [ ] Regra: produto com estoque zero não é ofertável

### Frontend
- [ ] Tela de Catálogo: listagem com busca e filtros
- [ ] Tela de Produto: cadastro/edição com todos os campos
- [ ] Tela de Preços: edição de tabela/atual/mínimo com histórico
- [ ] Tela de Estoque: ajuste manual com motivo
- [ ] Importação de catálogo via planilha
- [ ] Badge visual: disponível / esgotado

**Definition of Done:** Produtos cadastrados, preço mínimo protegido, estoque consultável via API.

---

## Sprint 3 — WhatsApp
**Objetivo:** Receber e enviar mensagens via Meta Business Platform.

### Backend
- [ ] Registrar webhook: POST /webhooks/whatsapp
- [ ] Verificação do webhook (GET com hub.challenge)
- [ ] Validar assinatura HMAC de cada evento
- [ ] Idempotência: não processar mensagem duplicada (provider_id)
- [ ] Persistir mensagem na tabela messages
- [ ] Identificar/criar contato pelo número de telefone
- [ ] Criar/retomar conversa por contato + tenant
- [ ] Enviar texto via WhatsApp API (client wrapper)
- [ ] Suporte a templates aprovados
- [ ] Fila de processamento com Bull/Redis (não bloquear webhook)

### Testes
- [ ] Simular webhook com payload real do Meta
- [ ] Testar idempotência (mesmo payload duas vezes = uma mensagem)
- [ ] Testar envio de resposta

**Definition of Done:** Mensagem chega → é salva → resposta é enviada.

---

## Sprint 4 — Inbox + Handoff
**Objetivo:** Equipe consegue ver conversas e assumir o atendimento.

### Backend
- [ ] GET /conversations — lista com filtros (status, assignee, source)
- [ ] GET /conversations/:id — conversa com histórico de mensagens
- [ ] POST /conversations/:id/handoff — transfere para humano com motivo e resumo
- [ ] Máquina de estados: NEW → AI_ACTIVE → HUMAN_ACTIVE → CLOSED etc.
- [ ] Ao humano assumir: IA para de responder
- [ ] Ao humano fechar: IA retoma (configurável)
- [ ] Notificação em tempo real (WebSocket ou polling)

### Frontend
- [ ] Tela de Inbox: lista de conversas com status e score
- [ ] Tela de Chat: histórico de mensagens + campo de resposta manual
- [ ] Botão "Assumir" e "Devolver para IA"
- [ ] Painel lateral: perfil do contato + lead score
- [ ] Badge de novas mensagens em tempo real

**Definition of Done:** Humano consegue ver, responder e devolver a conversa.

---

## Sprint 5 — Agent Runtime + Tools
**Objetivo:** IA atendendo clientes com dados reais, sem inventar informação.

### Backend — Agent Runtime
- [ ] Montar prompt dinâmico por blocos (identity, mission, truth, commercial, style, handoff, tools, safety)
- [ ] Carregar contexto da conversa (últimas N mensagens)
- [ ] Executar Claude API com tools
- [ ] Tool: `get_product_price(product_id, payment_method)` — consulta preço real
- [ ] Tool: `check_stock(product_id)` — verifica disponibilidade
- [ ] Tool: `check_discount(product_id, proposed_price)` — valida contra mínimo
- [ ] Tool: `calculate_installment(product_id, installments)` — calcula parcela
- [ ] Tool: `get_best_offer(product_id, payment_method)` — melhor condição autorizada
- [ ] Tool: `create_lead(contact_id, product_id, source)` — registra lead
- [ ] Tool: `request_handoff(reason, summary)` — transfere para humano
- [ ] Allowlist de tools por agente (segurança)
- [ ] Salvar tool_calls na tabela (input, output, duração)
- [ ] Validar resposta antes de enviar (safety check)

### Testes conversacionais
- [ ] "Qual o preço do iPhone 14 Pro 128GB?"
- [ ] "Tem no estoque?"
- [ ] "Qual o valor em 12x?"
- [ ] "Tem desconto no Pix?"
- [ ] "Pode me dar um desconto?"  → bloquear abaixo do mínimo
- [ ] "Quero falar com uma pessoa" → handoff

**Definition of Done:** Todos os testes passando sem inventar dados.

---

## Sprint 6 — Troca / Parte de Pagamento
**Objetivo:** Agente coleta dados do aparelho para troca e gera estimativa de valor.

### Backend
- [ ] CRUD de trade_rules (valor base por modelo)
- [ ] CRUD de trade_deductions (descontos: bateria, tela, traseira, carcaça, câmera, Face ID)
- [ ] Fórmula: valor_base + ajustes − descontos = estimativa
- [ ] POST /trade-evaluations — criar pré-avaliação
- [ ] POST /trade-evaluations/:id/calculate — aplicar regras e retornar valor
- [ ] Tool: `get_trade_base_value(model, storage)` — busca valor base
- [ ] Tool: `calculate_trade_deductions(evaluation_data)` — aplica descontos
- [ ] Tool: `create_trade_evaluation(data)` — registra pré-avaliação
- [ ] Tool: `request_trade_review(evaluation_id)` — solicita revisão humana
- [ ] Status: pré-avaliação / análise / aprovado / recusado
- [ ] Handoff automático quando troca exige inspeção física

### Frontend
- [ ] Tela de Regras de Troca: valor base por modelo
- [ ] Tela de Descontos: configuração por tipo e valor
- [ ] Tela de Avaliações: lista com status e valores
- [ ] Aprovação/rejeição de avaliação pelo humano

**Definition of Done:** Agente coleta dados de troca e retorna estimativa correta.

---

## Sprint 7 — Manutenção, Acessórios e Leads
**Objetivo:** Agente atende serviços e acessórios, e leads são registrados corretamente.

### Backend
- [ ] CRUD de services (serviço, preço, mínimo, prazo, garantia, compatibilidade)
- [ ] CRUD de service_orders
- [ ] CRUD de accessories (produto, SKU, preço, estoque, compatibilidade)
- [ ] Tool: `get_services(model)` — lista serviços compatíveis
- [ ] Tool: `get_accessories(model)` — lista acessórios compatíveis
- [ ] Lead scoring automático por sinais de conversa
- [ ] GET /leads — funil com filtros e score
- [ ] POST /leads com source (WhatsApp, indicação, anúncio etc.)

### Frontend
- [ ] Tela de Manutenção: cadastro de serviços e ordens
- [ ] Tela de Acessórios: catálogo com estoque
- [ ] Tela de Leads: funil kanban com score
- [ ] Filtros por origem, produto e prioridade

**Definition of Done:** Agente atende manutenção/acessórios; leads aparecem no painel com score.

---

## Sprint 8 — Segurança, Observabilidade e Testes
**Objetivo:** Sistema pronto para produção com logs, métricas e testes automatizados.

### Segurança
- [ ] Rate limiting por IP e por tenant
- [ ] Inputs externos tratados como não confiáveis (sanitização)
- [ ] Sem SQL arbitrário via modelo
- [ ] HTTPS forçado em todos os endpoints
- [ ] Secrets nunca no código (apenas env vars)
- [ ] Revisão de CORS, headers de segurança

### Observabilidade
- [ ] Logs estruturados (JSON) com tenant_id e conversation_id
- [ ] Métricas: tempo de resposta do agente, taxa de handoff, conversão
- [ ] Alertas de erro no Railway/Vercel
- [ ] Dashboard de auditoria: alterações de preço, estoque, regras, prompt

### Testes
- [ ] Todos os 15 acceptance tests do blueprint
- [ ] Testes de isolamento multi-tenant (tenant A não vê dados do tenant B)
- [ ] Teste de webhook duplicado (idempotência)
- [ ] Testes de bloqueio de preço abaixo do mínimo
- [ ] Testes de handoff automático

**Definition of Done:** Todos os testes passando, logs funcionando, auditoria completa.

---

## Sprint 9 — Piloto em Produção
**Objetivo:** Primeiro cliente real atendendo pelo WhatsApp com supervisão.

### Checklist
- [ ] Dados reais da loja importados (catálogo completo)
- [ ] WhatsApp oficial conectado e testado
- [ ] Usuários da equipe cadastrados com roles corretos
- [ ] Prompt final aprovado pelo dono da loja
- [ ] Knowledge base: FAQ, políticas, horários, endereço
- [ ] Treinamento da equipe para usar o Inbox
- [ ] Monitoramento ativo nas primeiras 48h
- [ ] Plano de contingência (fallback para humano em caso de falha)
- [ ] SLA de resposta definido

**Definition of Done:** Loja atendendo clientes reais, equipe confortável, nenhuma informação errada enviada.

---

## Sprint 10 — Métricas e Produto SaaS
**Objetivo:** Transformar o piloto em produto vendável para outros nichos.

### Analytics
- [ ] Dashboard: volume de atendimentos, taxa de resolução, taxa de handoff
- [ ] Funil de vendas: contato → lead qualificado → oferta → fechamento
- [ ] Tempo médio de resposta do agente
- [ ] NPS / satisfação (futuro)

### SaaS
- [ ] Tela de Billing: planos, consumo, renovação
- [ ] Onboarding self-service (outro nicho cria conta e configura sozinho)
- [ ] Templates de nicho: Mobile Store → Pneus → Imóveis etc.
- [ ] Documentação operacional para novos tenants

---

## Estrutura de Pastas do Projeto

```
agent-one-mobile/
├── backend/
│   └── src/
│       ├── routes/          # Endpoints da API
│       ├── services/        # Lógica de negócio
│       ├── agents/          # Agent Runtime + prompt builder
│       ├── tools/           # Tools do agente (preço, estoque, troca...)
│       ├── middleware/       # Auth, RBAC, tenant, rate limit
│       ├── db/              # Schema, migrations, seeds
│       └── utils/           # Helpers
├── frontend/
│   └── src/
│       ├── pages/           # Dashboard, Inbox, Catálogo, Leads...
│       ├── components/      # UI reutilizável
│       ├── hooks/           # React hooks
│       └── lib/             # API client, auth helpers
├── docs/                    # Blueprint, decisões, ADRs
├── scripts/                 # Migrations, seeds, importação
└── infra/                   # Config Railway/Vercel
```

---

## Princípios Inegociáveis

1. **A IA nunca inventa.** Preço, estoque, parcela, garantia — vêm sempre do banco.
2. **A IA conversa; o backend calcula.** Nenhuma conta comercial crítica feita pelo modelo.
3. **Preço mínimo é lei.** Bloqueado no backend, não só no frontend.
4. **Tenant isolation.** Dado de um tenant nunca vaza para outro.
5. **Tudo auditado.** Alteração de preço, regra, prompt — registrado com antes/depois.
6. **Handoff imediato** quando cliente pede humano. Sem exceção.
