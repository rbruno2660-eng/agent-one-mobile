# Security Fixes Applied

**Data:** 2026-10-03
**Commit:** `fix: security hardening — rate limit, sql params, signature verification, error handling`

---

## Fix 1 — Rate limit dedicado no webhook WhatsApp ✅

**Arquivo:** `backend/src/app.js`

Adicionado `webhookLimiter` (60 req/min por IP com `express-rate-limit`) aplicado exclusivamente na rota `/webhooks/whatsapp`. O rate limit global (300 req/15min) continuava insuficiente para impedir flood neste endpoint crítico.

---

## Fix 2 — SQL injection no tool executor ✅

**Arquivo:** `backend/src/agents/tool.executor.js` (case `get_trade_base_value`)

Eliminada a interpolação condicional de fragmento SQL que gerava queries estruturalmente diferentes dependendo do input. Substituído por parâmetro fixo `$3::text IS NULL OR storage ILIKE $3`, sempre passando 3 parâmetros (null quando storage ausente). Todos os valores externos chegam agora via placeholder `$N`.

---

## Fix 3 — verifySignature nunca passa sem secret ✅

**Arquivo:** `backend/src/services/whatsapp.service.js`

Removido o `return true` silencioso quando `WHATSAPP_APP_SECRET` não está configurado. Agora lança `Error` com mensagem de configuração clara, forçando o webhook a descartar o evento e logar o problema. Não há risco de eventos não autenticados serem processados por ausência acidental da variável de ambiente.

---

## Fix 4 — Stack trace em erros 500 ✅

**Arquivo:** `backend/src/app.js` (error handler global)

O handler já ocultava stack em prod, mas foi reforçado:
- Stack trace completo logado internamente (nunca no response body)
- Em produção **e** para qualquer status 5xx: mensagem genérica `'Erro interno do servidor'`
- Garantia explícita de que nenhum objeto `err` bruto é serializado na resposta

---

## Fix 5 — Mensagens de usuário nos logs ✅

**Arquivo:** `backend/src/queues/message.queue.js`

Substituído `console.log` que exibia os primeiros 80 chars do transcript do áudio por log de tamanho apenas:
```
// Antes: [Transcription] Áudio transcrito: "texto da mensagem do usuário..."
// Depois: [Transcription] Áudio transcrito com sucesso, chars: 142
```

---

## Fix 6 — Validação de UUID nos inputs de tools ✅

**Arquivo:** `backend/src/agents/tool.executor.js`

Adicionado helper `assertUUID(value, fieldName)` com regex `/^[0-9a-f]{8}-[0-9a-f]{4}-...$/i`. Aplicado antes de cada query que usa `input.product_id` nos cases: `get_product_price`, `check_stock`, `check_discount`, `calculate_installment`, `create_lead`. Rejeita valores malformados com `TypeError` antes de chegarem ao banco.

---

## Itens que precisariam de revisão manual adicional

- **Fix 5 ampliado:** verificar se há outros pontos no codebase (`agents/runtime.js`, `services/conversation.service.js`) onde conteúdo de mensagem é logado diretamente em `console.log` ou `logger.info`. O fix atual cobre apenas o transcript de áudio em `message.queue.js`.
- **Fix 6 ampliado:** `tenantId`, `conversationId` e `contactId` vêm do JWT/banco (contexto autenticado) — mas seria bom adicionar `assertUUID` também neles dentro de `executeTool` como defense-in-depth.
- **WHATSAPP_APP_SECRET em dev:** com Fix 3, ambientes de desenvolvimento sem a variável configurada passarão a lançar erro no webhook. Recomenda-se adicionar a variável ao `.env.example` e ao README.
