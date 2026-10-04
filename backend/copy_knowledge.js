/**
 * copy_knowledge.js
 * Copia todos os documentos de conhecimento de um tenant para outro via API.
 *
 * Uso:
 *   node copy_knowledge.js
 *
 * Configure as variáveis abaixo com os tokens JWT de cada tenant
 * (pegue no localStorage do browser: localStorage.getItem('token'))
 */

const https = require('https');
const http = require('http');

// ─── CONFIGURE AQUI ──────────────────────────────────────────────────────────
const BASE_URL = 'https://agent-one-mobile-production.up.railway.app';

// Token do tenant ORIGEM (quem tem a base de conhecimento)
const TOKEN_ORIGEM  = 'COLE_AQUI_O_JWT_DO_TENANT_ORIGEM';

// Token do tenant DESTINO (quem vai receber os docs)
const TOKEN_DESTINO = 'COLE_AQUI_O_JWT_DO_TENANT_DESTINO';
// ─────────────────────────────────────────────────────────────────────────────

function request(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const data = body ? JSON.stringify(body) : undefined;
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };

    const req = lib.request(options, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
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

async function run() {
  console.log('🔍 Buscando documentos do tenant origem...');
  const listRes = await request('GET', '/api/knowledge', TOKEN_ORIGEM);
  if (listRes.status !== 200) {
    console.error('Erro ao listar docs:', listRes.data);
    process.exit(1);
  }

  const docs = listRes.data;
  console.log(`Encontrados ${docs.length} documentos.\n`);

  let ok = 0, fail = 0;

  for (const doc of docs) {
    // Busca o conteúdo completo de cada doc
    const fullRes = await request('GET', `/api/knowledge/${doc.id}`, TOKEN_ORIGEM);
    if (fullRes.status !== 200) {
      console.warn(`  ⚠️  Falha ao buscar "${doc.title}" (${fullRes.status})`);
      fail++;
      continue;
    }

    const full = fullRes.data;

    // Cria o doc no tenant destino
    const createRes = await request('POST', '/api/knowledge', TOKEN_DESTINO, {
      title:    full.title,
      content:  full.content,
      category: full.category,
    });

    if (createRes.status === 201) {
      console.log(`  ✅  "${full.title}" (${full.category})`);
      ok++;
    } else {
      console.warn(`  ❌  "${full.title}" → ${JSON.stringify(createRes.data)}`);
      fail++;
    }
  }

  console.log(`\nConcluído: ${ok} copiados, ${fail} falhas.`);
}

run().catch(err => console.error('Erro fatal:', err.message));
