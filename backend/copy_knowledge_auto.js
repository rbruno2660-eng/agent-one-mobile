/**
 * copy_knowledge_auto.js
 * Faz login nos dois tenants e copia toda a base de conhecimento.
 * Roda localmente com: node backend/copy_knowledge_auto.js
 *
 * Node.js não tem CORS, então funciona sem precisar de token pré-configurado.
 */

const https = require('https');

const BASE = 'https://agent-one-mobile-production.up.railway.app';

// ── Credenciais ────────────────────────────────────────────────────────────────
// ORIGEM: o tenant que tem a base de conhecimento
const ORIGEM_EMAIL = 'admin@loja.com';     // ← ajuste se necessário
const ORIGEM_SENHA = 'Admin@2025';          // ← ajuste se necessário

// DESTINO: MeuCelular
const DESTINO_EMAIL = 'financeiro@meucelular.com';
const DESTINO_SENHA = 'meucelular2026adm';
// ──────────────────────────────────────────────────────────────────────────────

function request(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const data = body ? JSON.stringify(body) : undefined;

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };

    const req = https.request(options, res => {
      let raw = '';
      res.on('data', chunk => (raw += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, data: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function login(email, password) {
  console.log(`  → Login: ${email}`);
  const res = await request('POST', '/auth/login', null, { email, password });
  const token = res.data.token || res.data.accessToken;
  if (res.status !== 200 || !token) {
    console.error(`  ✗ Falha no login (${res.status}):`, JSON.stringify(res.data));
    process.exit(1);
  }
  console.log(`  ✓ Autenticado`);
  return token;
}

async function run() {
  console.log('\n🔑 Autenticando...');
  const tokenOrigem  = await login(ORIGEM_EMAIL, ORIGEM_SENHA);
  const tokenDestino = await login(DESTINO_EMAIL, DESTINO_SENHA);

  console.log('\n📋 Buscando documentos do tenant origem...');
  const listRes = await request('GET', '/knowledge', tokenOrigem);
  if (listRes.status !== 200) {
    console.error('Erro ao listar docs:', listRes.data);
    process.exit(1);
  }

  const docs = listRes.data;
  console.log(`   ${docs.length} documento(s) encontrado(s)\n`);

  if (docs.length === 0) {
    console.log('Nenhum documento para copiar. Verifique se o tenant origem tem base de conhecimento.');
    return;
  }

  console.log('📤 Copiando para MeuCelular...\n');
  let ok = 0, fail = 0;

  for (const doc of docs) {
    // Busca conteúdo completo
    const fullRes = await request('GET', `/knowledge/${doc.id}`, tokenOrigem);
    if (fullRes.status !== 200) {
      console.warn(`  ⚠  Falha ao buscar "${doc.title}" (${fullRes.status})`);
      fail++;
      continue;
    }

    const full = fullRes.data;

    // Cria no destino
    const createRes = await request('POST', '/knowledge', tokenDestino, {
      title:    full.title,
      content:  full.content,
      category: full.category || full.type,
    });

    if (createRes.status === 201) {
      console.log(`  ✅  [${(full.category || full.type || '?').padEnd(12)}] "${full.title}"`);
      ok++;
    } else if (createRes.status === 409) {
      console.log(`  ⤻   [já existe] "${full.title}"`);
      ok++;
    } else {
      console.warn(`  ❌  "${full.title}" → ${JSON.stringify(createRes.data)}`);
      fail++;
    }
  }

  console.log(`\n✔ Concluído: ${ok} copiado(s), ${fail} falha(s).\n`);
}

run().catch(err => {
  console.error('\n❌ Erro fatal:', err.message);
  process.exit(1);
});
