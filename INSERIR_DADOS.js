/**
 * Script de inserção de dados — Agent One Mobile Store
 * Executa: node INSERIR_DADOS.js
 * Requer: Node.js instalado
 */

const BASE = 'https://agent-one-mobile-production.up.railway.app';
// Rotas montadas sem prefixo /api (ver app.js)

// ─── Autenticação ─────────────────────────────────────────────────────────────
async function login() {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@loja.com', password: 'Admin@2025' }),
  });
  const d = await r.json();
  if (!d.accessToken) throw new Error('Login falhou: ' + JSON.stringify(d));
  console.log('✅ Login OK');
  return d.accessToken;
}

// ─── Produtos ─────────────────────────────────────────────────────────────────
const PRODUCTS = [
  // ── SEMINOVOS ──────────────────────────────────────────────────────────────
  { model: 'iPhone 11',         condition:'used', brand:'Apple', category:'iphone', storage:'64GB',  current_price:1190, pix_price:1190, min_price:1071, installments:[{installments:12,installment_value:99.17,total:1190}] },
  { model: 'iPhone 12 Pro',     condition:'used', brand:'Apple', category:'iphone', storage:'128GB', current_price:2290, pix_price:2290, min_price:2061, installments:[{installments:12,installment_value:190.83,total:2290}] },
  { model: 'iPhone 12 Pro Max', condition:'used', brand:'Apple', category:'iphone', storage:'128GB', current_price:2590, pix_price:2590, min_price:2331, installments:[{installments:12,installment_value:215.83,total:2590}] },
  { model: 'iPhone 13',         condition:'used', brand:'Apple', category:'iphone', storage:'128GB', current_price:2290, pix_price:2290, min_price:2061, installments:[{installments:12,installment_value:190.83,total:2290}] },
  { model: 'iPhone 13 Pro',     condition:'used', brand:'Apple', category:'iphone', storage:'128GB', current_price:3090, pix_price:3090, min_price:2781, installments:[{installments:12,installment_value:257.50,total:3090}] },
  { model: 'iPhone 13 Pro',     condition:'used', brand:'Apple', category:'iphone', storage:'256GB', current_price:3390, pix_price:3390, min_price:3051, installments:[{installments:12,installment_value:282.50,total:3390}] },
  { model: 'iPhone 13 Pro Max', condition:'used', brand:'Apple', category:'iphone', storage:'128GB', current_price:3490, pix_price:3490, min_price:3141, installments:[{installments:12,installment_value:290.83,total:3490}] },
  { model: 'iPhone 13 Pro Max', condition:'used', brand:'Apple', category:'iphone', storage:'256GB', current_price:3690, pix_price:3690, min_price:3321, installments:[{installments:12,installment_value:307.50,total:3690}] },
  { model: 'iPhone 14',         condition:'used', brand:'Apple', category:'iphone', storage:'128GB', current_price:2690, pix_price:2690, min_price:2421, installments:[{installments:12,installment_value:224.17,total:2690}] },
  { model: 'iPhone 14 Plus',    condition:'used', brand:'Apple', category:'iphone', storage:'128GB', current_price:2690, pix_price:2690, min_price:2421, installments:[{installments:12,installment_value:224.17,total:2690}] },
  { model: 'iPhone 14 Pro',     condition:'used', brand:'Apple', category:'iphone', storage:'128GB', current_price:3790, pix_price:3790, min_price:3411, installments:[{installments:12,installment_value:315.83,total:3790}] },
  { model: 'iPhone 14 Pro',     condition:'used', brand:'Apple', category:'iphone', storage:'256GB', current_price:3990, pix_price:3990, min_price:3591, installments:[{installments:12,installment_value:332.50,total:3990}] },
  { model: 'iPhone 14 Pro Max', condition:'used', brand:'Apple', category:'iphone', storage:'128GB', current_price:4090, pix_price:4090, min_price:3681, installments:[{installments:12,installment_value:340.83,total:4090}] },
  { model: 'iPhone 14 Pro Max', condition:'used', brand:'Apple', category:'iphone', storage:'256GB', current_price:4290, pix_price:4290, min_price:3861, installments:[{installments:12,installment_value:357.50,total:4290}] },
  { model: 'iPhone 15',         condition:'used', brand:'Apple', category:'iphone', storage:'128GB', current_price:3490, pix_price:3490, min_price:3141, installments:[{installments:12,installment_value:290.83,total:3490}] },
  { model: 'iPhone 15',         condition:'used', brand:'Apple', category:'iphone', storage:'256GB', current_price:3790, pix_price:3790, min_price:3411, installments:[{installments:12,installment_value:315.83,total:3790}] },
  { model: 'iPhone 15 Plus',    condition:'used', brand:'Apple', category:'iphone', storage:'128GB', current_price:3890, pix_price:3890, min_price:3501, installments:[{installments:12,installment_value:324.17,total:3890}] },
  { model: 'iPhone 15 Pro',     condition:'used', brand:'Apple', category:'iphone', storage:'128GB', current_price:4590, pix_price:4590, min_price:4131, installments:[{installments:12,installment_value:382.50,total:4590}] },
  { model: 'iPhone 15 Pro',     condition:'used', brand:'Apple', category:'iphone', storage:'256GB', current_price:4790, pix_price:4790, min_price:4311, installments:[{installments:12,installment_value:399.17,total:4790}] },
  { model: 'iPhone 15 Pro Max', condition:'used', brand:'Apple', category:'iphone', storage:'256GB', current_price:5490, pix_price:5490, min_price:4941, installments:[{installments:12,installment_value:457.50,total:5490}] },
  { model: 'iPhone 15 Pro Max', condition:'used', brand:'Apple', category:'iphone', storage:'1TB',   current_price:5690, pix_price:5690, min_price:5121, installments:[{installments:12,installment_value:474.17,total:5690}] },
  { model: 'iPhone 16',         condition:'used', brand:'Apple', category:'iphone', storage:'128GB', current_price:4590, pix_price:4590, min_price:4131, installments:[{installments:12,installment_value:382.50,total:4590}] },
  { model: 'iPhone 16 Pro',     condition:'used', brand:'Apple', category:'iphone', storage:'128GB', current_price:5590, pix_price:5590, min_price:5031, installments:[{installments:12,installment_value:465.83,total:5590}] },
  { model: 'iPhone 16 Pro',     condition:'used', brand:'Apple', category:'iphone', storage:'256GB', current_price:5890, pix_price:5890, min_price:5301, installments:[{installments:12,installment_value:490.83,total:5890}] },
  { model: 'iPhone 16 Pro Max', condition:'used', brand:'Apple', category:'iphone', storage:'256GB', current_price:6490, pix_price:6490, min_price:5841, installments:[{installments:12,installment_value:540.83,total:6490}] },
  // ── MacBooks Seminovos ──────────────────────────────────────────────────────
  { model: 'MacBook Air 13" i5', condition:'used', brand:'Apple', category:'accessory', storage:'128GB', variant:'8GB RAM', current_price:3290, pix_price:3290, min_price:2961, installments:[{installments:12,installment_value:274.17,total:3290}] },
  { model: 'MacBook Pro i5',     condition:'used', brand:'Apple', category:'accessory', storage:'256GB', variant:'8GB RAM', current_price:3890, pix_price:3890, min_price:3501, installments:[{installments:12,installment_value:324.17,total:3890}] },
  // ── LACRADOS ───────────────────────────────────────────────────────────────
  { model: 'Redmi Note 15',       condition:'new', brand:'Xiaomi', category:'accessory', storage:'256GB', variant:'8GB RAM', current_price:1690, pix_price:1690, min_price:1521, installments:[{installments:12,installment_value:140.83,total:1690}] },
  { model: 'Redmi Note 15 Pro 5G',condition:'new', brand:'Xiaomi', category:'accessory', storage:'256GB', variant:'8GB RAM', current_price:2590, pix_price:2590, min_price:2331, installments:[{installments:12,installment_value:215.83,total:2590}] },
  { model: 'Poco X8 Pro',         condition:'new', brand:'Xiaomi', category:'accessory', storage:'256GB', variant:'8GB RAM', current_price:2990, pix_price:2990, min_price:2691, installments:[{installments:12,installment_value:249.17,total:2990}] },
];

// ─── Serviços de manutenção ───────────────────────────────────────────────────
// Estrutura: [modelo, tela_incel, tela_1linha, tela_orig, vidro_tela, bateria, tampa, placa, cam_tras, cam_front, vidro_cam, conector, af_sup, af_inf, face_id, carcaca, botoes]
const SERVICES_RAW = [
  ['iPhone 7',       190, 190, null,  null, 170, null, 420, 199, 149,  79, 120,  89,  79, null, null, 149],
  ['iPhone 7 Plus',  200, 200, null,  null, 170, null, 420, 299, 149,  79, 140,  99,  79, null, null, 149],
  ['iPhone 8',       200, 200, null,  null, 180,  200, 420, 290, 149,  89, 190,  99,  99, null, null, 199],
  ['iPhone 8 Plus',  220, 220, null,  null, 190,  200, 420, 330, 149,  89, 220,  99,  99, null, null, 199],
  ['iPhone X',       297, 497, null,  null, 297,  297, 599, 330, 297,  89, 299, 179, 179,  299,  350, 249],
  ['iPhone XS',      397, 497, null,  null, 297,  297, 599, 330, 297,  89, 299, 179, 179,  399,  350, 249],
  ['iPhone XS Max',  397, 597, null,  null, 297,  297, 599, 330, 297,  89, 299, 179, 179,  399,  380, 249],
  ['iPhone XR',      297, 397, null,  null, 220,  200, 420, 300, 297,  89, 220,  99,  99, null, null, 249],
  ['iPhone SE 2',    200, 200, null,  null, 297,  200, 420, 330, 397,  89, 290, 189, 199,  399,  390, 329],
  ['iPhone 11',      267, 397, null,  null, 297,  297, 599, 690, 397,  99, 290, 189, 199,  399,  490, 329],
  ['iPhone 11 Pro',  457, 597, null,  null, 297,  297, 599, 690, 397,  99, 329, 229, 229,  399,  499, 329],
  ['iPhone 11 Pro Max', 457, 647, null, 400, 397, 397, 899, 499, 497,  99, 329, 279, 229,  499,  450, 399],
  ['iPhone 12',      297, 647, null,  400, 397,  397, 899, 499, 497,  99, 329, 279, 229,  499,  470, 399],
  ['iPhone 12 Mini', 297, 647, null,  400, 397,  397, 899,1190, 497, 119, 329, 299, 269,  499,  499, 399],
  ['iPhone 12 Pro',  297, 647, null,  490, 397,  397, 899,1190, 497, 169, 329, 299, 269,  499,  499, 399],
  ['iPhone 12 Pro Max', 667, 897, null, 490, 397, 397,1090, 599, 597, 169, 399, 299, 329,  499,  499, 399],
  ['iPhone 13',      457, 897,1280,   590, 397,  397,1090, 599, 597, 169, 399, 299, 329,  650,  599, 399],
  ['iPhone 13 Mini', 467, 897,1290,   590, 397,  397,1090, 599, 597, 169, 399, 299, 329,  650,  599, 399],
  ['iPhone 13 Pro',  957,1160,1980,   690, 397,  397,1090,1290, 697, 169, 399, 399, 399,  650,  699, 429],
  ['iPhone 13 Pro Max', 997,1290,1990, 700, 397, 397,1290,1290, 697, 169, 399, 399, 399,  650,  699, 429],
  ['iPhone 14',      457, 997,1490,   690, 397,  397,1290, 799, 797, 169, 399, 329, 329,  690,  799, 429],
  ['iPhone 14 Plus', 597,1090,1490,   690, 497,  497,1290, 799, 797, 169, 399, 329, 329,  690,  799, 429],
  ['iPhone 14 Pro',  997,1290,1960,   790, 497,  497,1290,1290, 997, 169, 499, 399, 399,  690,  799, 429],
  ['iPhone 14 Pro Max', 997,1490,2560, 890, 497, 497,1290,1290, 997, 169, 499, 399, 399,  690,  799, 499],
  ['iPhone 15',      687,1260,1690,   790, 497,  497,1499, 699, 897, 189, 499, 399, 399, null,  899, 499],
  ['iPhone 15 Plus', 567,1390,1850,   790, 520,  497,1499, 699, 897, 189, 499, 399, 399, null,  999, 499],
  ['iPhone 15 Pro', 1397,1560,2580,   890, 520,  530,1499,1290,1097, 189, 599, 429, 399, null,  989, 499],
  ['iPhone 15 Pro Max',1397,1760,2850, 990, 520, 530,1499,1290,1097, 189, 599, 429, 399, null,  989, 499],
  ['iPhone 16',     1497,1760,1790,   890, 497,  497,1799, 999, 997, 189, 599, 429, 399, null, null, 499],
  ['iPhone 16 Plus',1497,1790,1780,   890, 497,  497,1799, 999, 997, 189, 699, 429, 399, null, null, 499],
  ['iPhone 16 Pro', 1390,1990,2790,   990, 497,  597,1799,1399,1197, 199, 699, 499, 499, null, null, 499],
  ['iPhone 16 Pro Max',1690,2060,2890,1090, 497, 597,1799,1399,1197, 199, 699, 499, 499, null, null, null],
  ['iPhone 17',     null,2190,2890,  1290, null, 597, null, null,1097, 199, 899, 499, 499, null, null, null],
  ['iPhone 17 Pro', null,2390,2790,  1490, null, 797, null, null,1397, 259, 899, 499, 499, null, null, null],
  ['iPhone 17 Pro Max',null,2590,3890,1690,null, 797, null, null,1397, 259, 899, 499, 499, null, null, null],
];

const SERVICE_COLS = [
  'Tela INCEL (PIX)', 'Tela 1ª Linha', 'Tela Original', 'Vidro Tela',
  'Bateria (PIX)', 'Tampa Traseira (PIX)', 'Placa', 'Câmera Traseira',
  'Câmera Frontal', 'Vidro Câmera', 'Conector', 'Alto Falante Superior',
  'Alto Falante Inferior', 'Face ID', 'Carcaça', 'Botões'
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function post(url, token, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return r.json();
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    const token = await login();

    // ── Importar produtos ─────────────────────────────────────────────────────
    console.log(`\n📦 Importando ${PRODUCTS.length} produtos...`);
    const prodResult = await post(`${BASE}/products/import`, token, { products: PRODUCTS });
    console.log(`   ✅ ${prodResult.success} inseridos, ❌ ${prodResult.errors?.length || 0} erros`);
    if (prodResult.errors?.length) prodResult.errors.forEach(e => console.log(`   Erro row ${e.row}: ${e.error}`));

    // ── Inserir serviços ──────────────────────────────────────────────────────
    console.log(`\n🔧 Inserindo serviços de manutenção...`);
    let ok = 0, fail = 0;
    for (const row of SERVICES_RAW) {
      const [modelo, ...prices] = row;
      for (let i = 0; i < prices.length; i++) {
        const price = prices[i];
        if (!price) continue;
        const name = `${SERVICE_COLS[i]} — ${modelo}`;
        const body = {
          name,
          compatible_with: [modelo],
          price,
          min_price: Math.round(price * 0.85),
          warranty_days: 90,
          turnaround_days: 1,
        };
        const res = await post(`${BASE}/services`, token, body);
        if (res.id) { ok++; process.stdout.write('.'); }
        else { fail++; process.stdout.write('x'); }
        await sleep(80); // evitar sobrecarga
      }
    }
    console.log(`\n   ✅ ${ok} serviços inseridos, ❌ ${fail} erros`);

    console.log('\n🎉 Concluído! Acesse o sistema para ver os dados.');
  } catch (e) {
    console.error('Erro:', e.message);
    process.exit(1);
  }
})();
