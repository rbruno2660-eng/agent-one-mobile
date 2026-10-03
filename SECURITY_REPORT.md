# Relatório de Auditoria de Segurança — Agent One Mobile Store

**Data:** 02 de outubro de 2026  
**Auditado por:** Claude (Anthropic) — Cowork Mode  
**Escopo:** Backend Node.js/Express + PostgreSQL (Railway), WhatsApp AI Agent  
**Versão do commit:** 58ecae4

---

## 🔴 RESUMO EXECUTIVO — Top 5 Itens Urgentes

| # | Vulnerabilidade | Severidade | Ação imediata |
|---|-----------------|------------|---------------|
| 1 | **Credenciais reais no código-fonte** (DB, API Key Anthropic, WhatsApp App Secret) | **CRÍTICA** | Rotacionar TODAS as chaves agora; nunca commitar `.env` |
| 2 | **Webhook WhatsApp sem rate limiting** | **ALTA** | Adicionar rate limiter dedicado ao endpoint público `/webhooks/whatsapp` |
| 3 | **SQL injection condicional via string interpolation** (tool executor) | **ALTA** | Refatorar query dinâmica para parametrização completa |
| 4 | **`verifySignature` ignora assinatura em dev** e aceita webhook sem App Secret | **ALTA** | Exigir APP_SECRET em produção; rejeitar webhook se ausente |
| 5 | **Segredos WhatsApp armazenados em plaintext no banco** (`channels.settings.access_token`) | **MÉDIA** | Criptografar com AES-256 antes de persistir |

---

## Vulnerabilidades Detalhadas

---

### 🔴 CRÍTICA — C1: Credenciais reais expostas em múltiplos arquivos de código-fonte

**Arquivos afetados:**
- `backend/.env` (não commitado, mas presente no disco)
- `backend/check_test_tenant.js:4`
- `backend/copy_test_to_meucelular.js:14`
- `backend/create_meucelular.js:4`
- `backend/create_superadmin.js:11`
- `backend/fix_tenant.js:8`
- `backend/list_tenants.js:3`
- `backend/migrate_superadmin.js:11`
- `backend/setup_whatsapp_channel.js:11`
- `backend/update_phone.js:4`
- `SET_RAILWAY_WHATSAPP_VARS.bat` (raiz do projeto)

**Dados expostos:**
```
DATABASE_URL: postgresql://neondb_owner:npg_5tzqxIfPD6YC@ep-orange-night-aynhdfi2-pooler...
ANTHROPIC_API_KEY: sk-ant-api03-nJiIzb9Mkh-ThsL_SJPExW6Nw... (chave real)
WHATSAPP_TOKEN: EAAVbXzwMh1cBSYLtkDwsDINOMTeO2Y09nFkOy... (em SET_RAILWAY_WHATSAPP_VARS.bat)
WHATSAPP_APP_SECRET: 90ec94872fdefe4d5a6bd9a4f0a245ac (em SET_RAILWAY_WHATSAPP_VARS.bat)
JWT_SECRET: 43e3af912cfff45939713089dcdf0ce0... (no .env)
JWT_REFRESH_SECRET: 03d647de80ec5ddc02ecaa3c9218cac... (no .env)
```

Adicionalmente, `create_meucelular.js:31` contém senha hardcoded de tenant:
```js
const passwordHash = await bcrypt.hash('MeuCelular@2026', 12);
```

**Risco:** Acesso completo ao banco de dados Neon, aos gastos na Anthropic API, à conta WhatsApp Business e capacidade de forjar tokens JWT. Qualquer pessoa com acesso ao repositório ou ao sistema de arquivos pode comprometer toda a infraestrutura.

**Fix:**
1. **Agora:** Rotacionar IMEDIATAMENTE todas as credenciais expostas:
   - Revogar/regenerar `ANTHROPIC_API_KEY` em console.anthropic.com
   - Revogar `WHATSAPP_TOKEN` e `WHATSAPP_APP_SECRET` no Meta Developers
   - Resetar senha do banco no painel Neon
   - Gerar novos `JWT_SECRET` e `JWT_REFRESH_SECRET`
2. Remover todas as connection strings hardcoded dos scripts utilitários — usar `process.env.DATABASE_URL`
3. Garantir que `.gitignore` já está configurado (✅ está) — verificar que nenhum `.env` está no histórico git
4. Adicionar `pre-commit` hook (husky + git-secrets) para bloquear credenciais
5. Para `SET_RAILWAY_WHATSAPP_VARS.bat`: nunca armazenar tokens em scripts; usar `railway variables set` interativamente

---

### 🔴 ALTA — C2: Webhook WhatsApp sem rate limiting

**Arquivo:** `backend/src/app.js` + `backend/src/routes/whatsapp.js`

**Código problemático:**
```js
// app.js — rate limit global: 300 req/15min para QUALQUER rota
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, ... }));

// Webhook público sem limiter específico
app.use('/webhooks/whatsapp', require('./routes/whatsapp'));
```

**Risco:** O endpoint `POST /webhooks/whatsapp` é público (sem autenticação) e só tem o rate limiter global de 300 req/15min. Um atacante pode:
- Inundar o servidor com mensagens forjadas, esgotando CPU e tokens da Anthropic API
- Criar milhares de conversas/contatos fictícios no banco
- Mesmo com `verifySignature`, o processamento ocorre assincronamente via `setImmediate` — centenas de req/s antes do rate limit atuar

**Fix:**
```js
// backend/src/app.js
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 60,                  // 60 req/min (Meta envia ~1-5/segundo em pico)
  keyGenerator: (req) => req.ip,
  message: { error: 'Rate limit excedido no webhook' },
});
app.use('/webhooks/whatsapp', webhookLimiter, require('./routes/whatsapp'));
```

---

### 🔴 ALTA — C3: SQL injection via string interpolation condicional no tool executor

**Arquivo:** `backend/src/agents/tool.executor.js:85-91`

**Código problemático:**
```js
const result = await query(
  `SELECT model, storage, base_value, min_value, max_value FROM trade_rules
   WHERE tenant_id = $1 AND active = true
     AND model ILIKE $2
     ${input.storage ? 'AND (storage ILIKE $3 OR storage IS NULL)' : ''}  // ← interpolação
   ORDER BY storage NULLS LAST LIMIT 5`,
  input.storage ? [tenantId, `%${input.model}%`, `%${input.storage}%`] : [tenantId, `%${input.model}%`]
);
```

**Risco:** `input.storage` vem da IA (que por sua vez processa mensagens do usuário). Embora o valor seja parametrizado no array de valores, a *cláusula SQL* é construída via interpolação de string — um atacante que consiga injetar texto na condição booleana pode alterar a estrutura da query. Embora limitado, cria um padrão perigoso difícil de auditar.

**Fix:**
```js
// Sempre incluir a cláusula, tornando storage opcional via IS NULL
const result = await query(
  `SELECT model, storage, base_value, min_value, max_value FROM trade_rules
   WHERE tenant_id = $1 AND active = true
     AND model ILIKE $2
     AND ($3::text IS NULL OR storage ILIKE $3)
   ORDER BY storage NULLS LAST LIMIT 5`,
  [tenantId, `%${input.model}%`, input.storage ? `%${input.storage}%` : null]
);
```

---

### 🔴 ALTA — C4: Verificação HMAC bypassável — webhook aceita requisições sem App Secret

**Arquivo:** `backend/src/services/whatsapp.service.js:67-81`

**Código problemático:**
```js
function verifySignature(rawBody, signature) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // ← BYPASS: pular em dev se não configurado
  // ...
}
```

**Risco duplo:**
1. Se `WHATSAPP_APP_SECRET` estiver ausente em qualquer ambiente (não apenas dev), qualquer requisição HTTP forjada ao endpoint público passa na verificação
2. O webhook responde `200 EVENT_RECEIVED` *antes* de verificar a assinatura — um timing window onde mensagens forjadas já foram aceitas para processamento assíncrono

**Código atual:**
```js
router.post('/', async (req, res) => {
  res.status(200).send('EVENT_RECEIVED');  // ← responde antes de verificar
  try {
    const signature = req.headers['x-hub-signature-256'];
    if (!verifySignature(req.rawBody || JSON.stringify(req.body), signature)) {
      console.warn('[Webhook] Assinatura inválida — descartando evento');
      return; // já respondeu 200, mas descarta — problema é o processamento assíncrono
    }
```

**Fix:**
```js
// whatsapp.service.js — exigir secret em produção
function verifySignature(rawBody, signature) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('WHATSAPP_APP_SECRET não configurado em produção');
    }
    return true; // apenas em dev
  }
  // ... resto da verificação
}

// whatsapp.js route — verificar ANTES de responder 200
router.post('/', async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  if (!verifySignature(req.rawBody || JSON.stringify(req.body), signature)) {
    return res.status(401).send('Unauthorized');
  }
  res.status(200).send('EVENT_RECEIVED');
  // processar após responder
  setImmediate(() => processWebhook(req.body));
});
```

---

### 🟡 MÉDIA — C5: Tokens WhatsApp em plaintext no banco de dados

**Arquivo:** `backend/src/routes/superadmin.js:148-170`

**Código problemático:**
```js
await query(
  `UPDATE channels SET ... settings = settings || $3::jsonb ...`,
  [phone_id, phone_number, JSON.stringify({ access_token: whatsapp_token }), id]
);
```

**Risco:** O access token da WhatsApp Cloud API fica armazenado em plaintext na coluna JSONB `channels.settings`. Um vazamento do banco (dump, misconfiguration, CVE em Neon) expõe os tokens diretamente.

**Fix:**
```js
// utils/crypto.js
const crypto = require('crypto');
const ALGO = 'aes-256-gcm';

function encrypt(text) {
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32 bytes
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}.${tag.toString('hex')}.${encrypted.toString('hex')}`;
}

function decrypt(data) {
  const [ivHex, tagHex, encHex] = data.split('.');
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8');
}

module.exports = { encrypt, decrypt };
```

---

### 🟡 MÉDIA — C6: Mensagens do usuário (WhatsApp) logadas no console em modo de transcrição

**Arquivo:** `backend/src/queues/message.queue.js:54`

**Código problemático:**
```js
console.log(`[Transcription] Áudio transcrito: "${transcript.slice(0, 80)}..."`);
```

**Risco:** Conteúdo de mensagens privadas dos clientes é impresso nos logs do Railway, potencialmente armazenado em plataformas de log externas. Viola LGPD (Lei 13.709/2018) que proíbe processamento desnecessário de dados pessoais.

**Fix:**
```js
// Substituir por log estruturado sem conteúdo
logger.info('[Transcription] Áudio transcrito com sucesso', {
  mediaId: message.audio.id,
  chars: transcript.length
  // sem o conteúdo
});
```

---

### 🟡 MÉDIA — C7: `authMiddleware` vaza stack trace interno em erros 500

**Arquivo:** `backend/src/middleware/auth.js:30-32`

**Código problemático:**
```js
} catch (err) {
  console.error('authMiddleware error:', err);  // loga stack completo
  res.status(500).json({ error: 'Erro interno de autenticação' });
}
```

**Risco:** O `console.error` com o objeto `err` completo imprime stack trace nos logs. Se os logs forem acessíveis (Railway log dashboard), expõem informações sobre a estrutura interna do sistema.

**Fix:**
```js
} catch (err) {
  logger.error('authMiddleware error', { message: err.message }); // sem stack
  res.status(500).json({ error: 'Erro interno de autenticação' });
}
```

---

### 🟡 MÉDIA — C8: Ausência de validação de input nos tool inputs da IA

**Arquivo:** `backend/src/agents/tool.executor.js`

**Problema:** Os inputs das tools são fornecidos diretamente pela Claude API sem validação de tipo/formato antes de serem usados em queries:

```js
case 'get_product_price': {
  output = await productService.getProductPrice(tenantId, input.product_id, ...);
  // input.product_id não é validado como UUID válido antes da query
}

case 'check_stock': {
  const result = await query(
    `SELECT ... FROM inventory i WHERE i.product_id = $1`,
    [input.product_id]  // sem validar UUID
  );
}
```

**Risco:** Se a IA (por prompt injection via mensagem do cliente) retornar um `product_id` malformado, pode causar erros não tratados ou comportamentos inesperados.

**Fix:**
```js
const { validate: uuidValidate } = require('uuid');

function validateToolInput(toolName, input) {
  const uuidFields = { 
    get_product_price: ['product_id'],
    check_stock: ['product_id'],
    check_discount: ['product_id'],
    calculate_installment: ['product_id'],
  };
  for (const field of (uuidFields[toolName] || [])) {
    if (input[field] && !uuidValidate(input[field])) {
      throw new Error(`${field} inválido para tool ${toolName}`);
    }
  }
}
```

---

### 🟡 MÉDIA — C9: Endpoint `/superadmin/tenants/:id/register-phone` sem validação do PIN

**Arquivo:** `backend/src/routes/superadmin.js:198-220`

**Código problemático:**
```js
router.post('/tenants/:id/register-phone', async (req, res) => {
  try {
    const { id } = req.params;
    const { pin = '000000' } = req.body;  // ← sem validação de formato
```

**Risco:** O PIN default é `000000` — fraquíssimo para registro na Cloud API. Sem Zod validation neste endpoint específico (ao contrário de `/activate`), PINs malformados chegam ao Meta sem filtragem.

**Fix:**
```js
const { pin = '000000' } = z.object({
  pin: z.string().regex(/^\d{6}$/, 'PIN deve ter exatamente 6 dígitos').default('000000')
}).parse(req.body);
```

---

### 🟢 BAIXA — C10: Ausência de Content Security Policy (CSP) no frontend

**Arquivo:** `frontend/next.config.js`

**Código problemático:**
```js
// next.config.js — sem headers de segurança customizados
```

**Risco:** O Helmet está configurado no backend, mas o frontend Next.js não tem CSP definida. Isso permite carregamento de scripts de origens externas não autorizadas (XSS via CDN comprometida).

**Fix:** Adicionar em `next.config.js`:
```js
module.exports = {
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; ..." },
      ],
    }];
  },
};
```

---

### 🟢 BAIXA — C11: DELETE em cascata de conversa sem validar tenant nas tabelas dependentes

**Arquivo:** `backend/src/routes/conversations.js:122-135`

**Código problemático:**
```js
await query(`DELETE FROM tool_calls WHERE conversation_id = $1`, [id]);
await query(`DELETE FROM handoffs WHERE conversation_id = $1`, [id]);
// ...sem tenant_id nas deletes dependentes
```

**Risco:** Apenas a verificação inicial confere `tenant_id`. Se houver inconsistência no banco, deletes subsequentes atuam por `conversation_id` sozinho — risco teórico de cross-tenant data deletion em edge cases.

**Fix:**
```js
// Adicionar tenant_id em todos os deletes dependentes
await query(`DELETE FROM tool_calls WHERE conversation_id = $1 AND tenant_id = $2`, [id, req.tenantId]);
await query(`DELETE FROM handoffs WHERE conversation_id = $1 AND tenant_id = $2`, [id, req.tenantId]);
// etc.
```

---

### 🟢 BAIXA — C12: Dependências — versões com potencial divergência

**Arquivo:** `backend/package.json`

**Observação:** `npm audit` não pôde ser executado (rede bloqueada no ambiente de auditoria), mas as seguintes versões merecem atenção:
- `express: ^4.19.2` — Express 4.x tem `path-to-regexp` CVE (ReDoS) em versões < 4.21.0 — **verificar**
- `@anthropic-ai/sdk: ^0.27.0` — atualizar regularmente para receber patches de segurança
- `bull: ^4.12.2` — verificar CVEs em ioredis
- `bcryptjs: ^2.4.3` — versão antiga; considerar `bcrypt` nativo ou `argon2`

**Fix:** Executar `npm audit` e `npm audit fix` regularmente. Configurar Dependabot no GitHub.

---

## 📊 Resumo de Severidades

| Severidade | Quantidade | Itens |
|------------|-----------|-------|
| 🔴 CRÍTICA | 1 | C1 |
| 🔴 ALTA    | 3 | C2, C3, C4 |
| 🟡 MÉDIA   | 5 | C5, C6, C7, C8, C9 |
| 🟢 BAIXA   | 3 | C10, C11, C12 |
| **Total**  | **12** | |

---

## ✅ Pontos Positivos Identificados

O projeto demonstra boas práticas em várias áreas:

1. **Helmet configurado** — headers de segurança HTTP presentes no backend
2. **Rate limiting geral** — 300 req/15min global + 20 req/15min para `/auth`
3. **bcrypt com cost factor 12** — hashing de senhas correto
4. **JWT com refresh token no banco** — permite revogação real de sessões
5. **Prepared statements** — 99% das queries usam `$1, $2...` parametrizados
6. **Isolamento multi-tenant** — `tenant_id` presente em todas as queries críticas
7. **Zod para validação de input** — a maioria das rotas valida inputs
8. **CORS restritivo** — apenas origens configuradas em `FRONTEND_URL`
9. **timingSafeEqual** para comparação de assinaturas HMAC — previne timing attacks
10. **Idempotência no webhook** — `provider_id` evita reprocessamento de duplicatas
11. **Auditlog implementado** — alterações de preço e produto são registradas com before/after
12. **Erro 500 não vaza detalhes em produção** — `err.message` suprimido para status >= 500

---

## 🗺️ Ordem de Correção Recomendada

### Imediato (hoje)
1. Rotacionar TODAS as credenciais expostas (C1)
2. Remover connection strings hardcoded dos scripts utilitários (C1)
3. Adicionar `WHATSAPP_APP_SECRET` obrigatório em produção (C4)

### Esta semana
4. Rate limiter dedicado no webhook (C2)
5. Refatorar query dinâmica no tool executor (C3)
6. Validar UUIDs nos inputs das tools (C8)

### Próximas 2 semanas
7. Criptografar tokens WhatsApp no banco (C5)
8. Remover logs de conteúdo de mensagens (C6)
9. Melhorar logging de erros internos (C7)
10. Validação de PIN no register-phone (C9)

### Backlog
11. CSP no frontend (C10)
12. tenant_id nos deletes em cascata (C11)
13. npm audit + atualizações de dependências (C12)

---

*Relatório gerado em 02/10/2026 por auditoria estática de código-fonte.*
