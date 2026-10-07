/**
 * Rotas públicas (sem autenticação) — Agent One
 *
 * GET /public/catalog/:slug  — catálogo de produtos da loja pelo slug
 * GET /public/catalog/:slug/product/:id — detalhes de um produto
 */

const router = require('express').Router();
const { query } = require('../db/pool');

// GET /public/catalog/:slug — catálogo público da loja
router.get('/catalog/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { search, category, condition, min_price, max_price } = req.query;

    // Busca tenant pelo slug
    const tenantResult = await query(
      `SELECT id, name, niche FROM tenants WHERE slug = $1 AND status = 'active'`,
      [slug]
    );
    if (!tenantResult.rows.length) return res.status(404).json({ error: 'Loja não encontrada' });

    const tenant = tenantResult.rows[0];
    const tid = tenant.id;

    // Filtros dinâmicos de produto
    const conditions = [
      `p.tenant_id = $1`,
      `p.active = true`,
      `(p.available > 0 OR p.available IS NULL)`,
    ];
    const values = [tid];
    let i = 2;

    if (search) {
      conditions.push(`(p.model ILIKE $${i} OR p.variant ILIKE $${i} OR p.description ILIKE $${i})`);
      values.push(`%${search}%`);
      i++;
    }
    if (category) { conditions.push(`p.category = $${i++}`); values.push(category); }
    if (condition) { conditions.push(`p.condition = $${i++}`); values.push(condition); }
    if (min_price) { conditions.push(`p.current_price >= $${i++}`); values.push(parseFloat(min_price)); }
    if (max_price) { conditions.push(`p.current_price <= $${i++}`); values.push(parseFloat(max_price)); }

    const productsResult = await query(`
      SELECT
        p.id, p.model, p.variant, p.storage, p.color, p.condition,
        p.current_price, p.original_price, p.available, p.category,
        p.description, p.images, p.created_at
      FROM products p
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.current_price ASC
      LIMIT 100
    `, values);

    // Categorias disponíveis para filtro
    const categoriesResult = await query(
      `SELECT DISTINCT category FROM products WHERE tenant_id = $1 AND active = true AND category IS NOT NULL ORDER BY category`,
      [tid]
    );

    res.json({
      store: { name: tenant.name, slug, niche: tenant.niche },
      products: productsResult.rows.map(p => ({
        id: p.id,
        model: p.model,
        variant: p.variant,
        storage: p.storage,
        color: p.color,
        condition: p.condition,
        price: p.current_price ? parseFloat(p.current_price) : null,
        original_price: p.original_price ? parseFloat(p.original_price) : null,
        available: p.available,
        category: p.category,
        description: p.description,
        images: p.images || [],
      })),
      categories: categoriesResult.rows.map(r => r.category),
      total: productsResult.rows.length,
    });
  } catch (err) {
    console.error('[Public/Catalog]', err.message);
    res.status(500).json({ error: 'Erro ao carregar catálogo' });
  }
});

// GET /public/catalog/:slug/product/:id — detalhes de um produto
router.get('/catalog/:slug/product/:id', async (req, res) => {
  try {
    const { slug, id } = req.params;

    const tenantResult = await query(
      `SELECT id, name FROM tenants WHERE slug = $1 AND status = 'active'`,
      [slug]
    );
    if (!tenantResult.rows.length) return res.status(404).json({ error: 'Loja não encontrada' });

    const tid = tenantResult.rows[0].id;

    const productResult = await query(
      `SELECT * FROM products WHERE id = $1 AND tenant_id = $2 AND active = true`,
      [id, tid]
    );
    if (!productResult.rows.length) return res.status(404).json({ error: 'Produto não encontrado' });

    const p = productResult.rows[0];
    res.json({
      id: p.id,
      model: p.model,
      variant: p.variant,
      storage: p.storage,
      color: p.color,
      condition: p.condition,
      price: p.current_price ? parseFloat(p.current_price) : null,
      original_price: p.original_price ? parseFloat(p.original_price) : null,
      available: p.available,
      category: p.category,
      description: p.description,
      images: p.images || [],
    });
  } catch (err) {
    console.error('[Public/Product]', err.message);
    res.status(500).json({ error: 'Erro ao carregar produto' });
  }
});

module.exports = router;
