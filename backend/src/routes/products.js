const router = require('express').Router();
const { z } = require('zod');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const productService = require('../services/product.service');
const { query } = require('../db/pool');
const { auditLog } = require('../utils/audit');

router.use(authMiddleware);

// ─── GET /products ─────────────────────────────
router.get('/', async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      condition: req.query.condition,
      model: req.query.model,
      active: req.query.active !== undefined ? req.query.active === 'true' : undefined,
    };
    const products = await productService.listProducts(req.tenantId, filters);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar produtos' });
  }
});

// ─── GET /products/:id ─────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const product = await productService.getProduct(req.tenantId, req.params.id);
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar produto' });
  }
});

// ─── GET /products/:id/price ───────────────────
router.get('/:id/price', async (req, res) => {
  try {
    const result = await productService.getProductPrice(
      req.tenantId,
      req.params.id,
      req.query.payment_method || 'all'
    );
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// ─── POST /products ────────────────────────────
router.post('/', requireRole('manager'), async (req, res) => {
  try {
    const schema = z.object({
      model: z.string().min(2),
      condition: z.enum(['new', 'used']),
      category: z.enum(['iphone', 'accessory', 'service']).default('iphone'),
      brand: z.string().default('Apple'),
      variant: z.string().optional(),
      storage: z.string().optional(),
      color: z.string().optional(),
      battery_health: z.number().int().min(0).max(100).optional(),
      warranty: z.string().optional(),
      description: z.string().optional(),
      quantity: z.number().int().min(0).default(0),
      current_price: z.number().positive().optional(),
      table_price: z.number().positive().optional(),
      min_price: z.number().positive().optional(),
      pix_price: z.number().positive().optional(),
      installments: z.array(z.object({
        installments: z.number().int().positive(),
        installment_value: z.number().positive(),
        total: z.number().positive(),
      })).optional(),
      active: z.boolean().default(true),
    });

    const data = schema.parse(req.body);
    const product = await productService.createProduct(req.tenantId, data, req.user);
    res.status(201).json(product);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Dados inválidos', details: err.errors });
    res.status(500).json({ error: err.message || 'Erro ao criar produto' });
  }
});

// ─── PATCH /products/:id ───────────────────────
router.patch('/:id', requireRole('manager'), async (req, res) => {
  try {
    const product = await productService.updateProduct(req.tenantId, req.params.id, req.body, req.user);
    res.json(product);
  } catch (err) {
    if (err.message === 'Produto não encontrado') return res.status(404).json({ error: err.message });
    res.status(500).json({ error: err.message || 'Erro ao atualizar produto' });
  }
});

// ─── PATCH /products/:id/toggle ───────────────
router.patch('/:id/toggle', requireRole('manager'), async (req, res) => {
  try {
    const current = await productService.getProduct(req.tenantId, req.params.id);
    if (!current) return res.status(404).json({ error: 'Produto não encontrado' });
    const updated = await productService.updateProduct(req.tenantId, req.params.id, { active: !current.active }, req.user);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao alterar status do produto' });
  }
});

// ─── POST /products/:id/check-discount ────────
router.post('/:id/check-discount', async (req, res) => {
  try {
    const { proposed_price } = req.body;
    if (!proposed_price) return res.status(400).json({ error: 'proposed_price obrigatório' });
    const result = await productService.checkDiscount(req.tenantId, req.params.id, parseFloat(proposed_price));
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// ─── PATCH /inventory/:productId ──────────────
router.patch('/:id/inventory', requireRole('manager'), async (req, res) => {
  try {
    const { quantity, reason } = req.body;
    if (quantity === undefined || quantity < 0) return res.status(400).json({ error: 'quantity inválido' });

    const before = await query(
      `SELECT quantity FROM inventory WHERE product_id = $1 AND tenant_id = $2`,
      [req.params.id, req.tenantId]
    );
    if (before.rows.length === 0) return res.status(404).json({ error: 'Produto não encontrado' });

    const result = await query(
      `UPDATE inventory SET quantity = $1, updated_at = NOW() WHERE product_id = $2 AND tenant_id = $3 RETURNING *`,
      [quantity, req.params.id, req.tenantId]
    );

    await auditLog({
      tenantId: req.tenantId,
      actor: req.user,
      action: 'update_inventory',
      entity: 'inventory',
      entityId: req.params.id,
      before: { quantity: before.rows[0].quantity },
      after: { quantity, reason: reason || null },
      ip: req.ip,
    });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar estoque' });
  }
});

// ─── DELETE /products/:id ─────────────────────
router.delete('/:id', requireRole('manager'), async (req, res) => {
  try {
    const { query } = require('../db/pool');
    const result = await query(
      `DELETE FROM products WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [req.params.id, req.tenantId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir produto' });
  }
});

// ─── POST /products/import ────────────────────
// Importação via JSON (frontend converte CSV/XLSX antes de enviar)
router.post('/import', requireRole('manager'), async (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Lista de produtos inválida' });
    }

    const results = { success: 0, errors: [] };
    for (let idx = 0; idx < products.length; idx++) {
      try {
        await productService.createProduct(req.tenantId, products[idx], req.user);
        results.success++;
      } catch (err) {
        results.errors.push({ row: idx + 1, error: err.message });
      }
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Erro na importação' });
  }
});

module.exports = router;
