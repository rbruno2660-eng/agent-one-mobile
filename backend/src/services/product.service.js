const { query, getClient } = require('../db/pool');
const { auditLog } = require('../utils/audit');

// ─── LISTAGEM ──────────────────────────────────
async function listProducts(tenantId, filters = {}) {
  const conditions = ['p.tenant_id = $1'];
  const values = [tenantId];
  let i = 2;

  if (filters.category) { conditions.push(`p.category = $${i++}`); values.push(filters.category); }
  if (filters.condition) { conditions.push(`p.condition = $${i++}`); values.push(filters.condition); }
  if (filters.model)     { conditions.push(`p.model ILIKE $${i++}`); values.push(`%${filters.model}%`); }
  if (filters.active !== undefined) { conditions.push(`p.active = $${i++}`); values.push(filters.active); }

  const where = conditions.join(' AND ');

  const result = await query(`
    SELECT
      p.*,
      i.quantity,
      i.reserved,
      (i.quantity - i.reserved) AS available,
      pp.current_price,
      pp.min_price,
      pp.table_price,
      pp.pix_price
    FROM products p
    LEFT JOIN inventory i ON i.product_id = p.id
    LEFT JOIN price_books pb ON pb.tenant_id = p.tenant_id AND pb.name = 'default'
    LEFT JOIN product_prices pp ON pp.product_id = p.id AND pp.price_book_id = pb.id
    WHERE ${where}
    ORDER BY p.model, p.variant, p.storage, p.condition
  `, values);

  return result.rows;
}

// ─── BUSCA POR ID ──────────────────────────────
async function getProduct(tenantId, productId) {
  const result = await query(`
    SELECT
      p.*,
      i.quantity,
      i.reserved,
      (i.quantity - i.reserved) AS available,
      pp.id AS price_id,
      pp.current_price,
      pp.min_price,
      pp.table_price,
      pp.pix_price,
      pp.price_book_id
    FROM products p
    LEFT JOIN inventory i ON i.product_id = p.id
    LEFT JOIN price_books pb ON pb.tenant_id = p.tenant_id AND pb.name = 'default'
    LEFT JOIN product_prices pp ON pp.product_id = p.id AND pp.price_book_id = pb.id
    WHERE p.id = $1 AND p.tenant_id = $2
  `, [productId, tenantId]);

  if (result.rows.length === 0) return null;

  const product = result.rows[0];

  // Busca parcelas
  if (product.price_id) {
    const inst = await query(
      `SELECT installments, installment_value, total FROM installments WHERE product_price_id = $1 ORDER BY installments`,
      [product.price_id]
    );
    product.installments = inst.rows;
  }

  return product;
}

// ─── CRIAR PRODUTO ─────────────────────────────
async function createProduct(tenantId, data, actor) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Produto
    const pResult = await client.query(`
      INSERT INTO products (tenant_id, category, brand, model, variant, storage, color, condition, battery_health, warranty, description, active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
    `, [
      tenantId,
      data.category || 'iphone',
      data.brand || 'Apple',
      data.model,
      data.variant || null,
      data.storage || null,
      data.color || null,
      data.condition,
      data.battery_health || null,
      data.warranty || null,
      data.description || null,
      data.active !== false,
    ]);
    const product = pResult.rows[0];

    // Estoque inicial
    await client.query(
      `INSERT INTO inventory (product_id, tenant_id, quantity, reserved) VALUES ($1,$2,$3,0)`,
      [product.id, tenantId, data.quantity || 0]
    );

    // Price book padrão
    const pbResult = await client.query(
      `SELECT id FROM price_books WHERE tenant_id = $1 AND name = 'default' LIMIT 1`,
      [tenantId]
    );

    if (pbResult.rows.length > 0 && data.current_price != null) {
      const priceResult = await client.query(`
        INSERT INTO product_prices (product_id, price_book_id, tenant_id, table_price, current_price, min_price, pix_price)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *
      `, [
        product.id,
        pbResult.rows[0].id,
        tenantId,
        data.table_price || data.current_price,
        data.current_price,
        data.min_price || data.current_price,
        data.pix_price || null,
      ]);

      // Parcelas
      if (data.installments?.length > 0) {
        for (const inst of data.installments) {
          await client.query(
            `INSERT INTO installments (product_price_id, tenant_id, installments, installment_value, total)
             VALUES ($1,$2,$3,$4,$5)`,
            [priceResult.rows[0].id, tenantId, inst.installments, inst.installment_value, inst.total]
          );
        }
      }
    }

    await client.query('COMMIT');

    await auditLog({ tenantId, actor, action: 'create_product', entity: 'product', entityId: product.id, after: product });
    return await getProduct(tenantId, product.id);

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── ATUALIZAR PRODUTO ─────────────────────────
async function updateProduct(tenantId, productId, data, actor) {
  const before = await getProduct(tenantId, productId);
  if (!before) throw new Error('Produto não encontrado');

  const fields = [];
  const values = [];
  let i = 1;

  const updatable = ['model','variant','storage','color','condition','battery_health','warranty','description','active','brand','category'];
  for (const field of updatable) {
    if (data[field] !== undefined) {
      fields.push(`${field} = $${i++}`);
      values.push(data[field]);
    }
  }

  if (fields.length === 0 && !data.current_price && data.quantity === undefined) {
    throw new Error('Nenhum campo para atualizar');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    if (fields.length > 0) {
      values.push(productId, tenantId);
      await client.query(
        `UPDATE products SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${i++} AND tenant_id = $${i}`,
        values
      );
    }

    // Atualiza preço
    if (data.current_price !== undefined || data.min_price !== undefined || data.table_price !== undefined || data.pix_price !== undefined) {
      const pbResult = await client.query(
        `SELECT id FROM price_books WHERE tenant_id = $1 AND name = 'default' LIMIT 1`,
        [tenantId]
      );
      if (pbResult.rows.length > 0) {
        const priceFields = [];
        const priceValues = [];
        let pi = 1;
        if (data.table_price !== undefined) { priceFields.push(`table_price = $${pi++}`); priceValues.push(data.table_price); }
        if (data.current_price !== undefined) { priceFields.push(`current_price = $${pi++}`); priceValues.push(data.current_price); }
        if (data.min_price !== undefined) { priceFields.push(`min_price = $${pi++}`); priceValues.push(data.min_price); }
        if (data.pix_price !== undefined) { priceFields.push(`pix_price = $${pi++}`); priceValues.push(data.pix_price); }
        priceValues.push(productId, pbResult.rows[0].id);
        await client.query(
          `UPDATE product_prices SET ${priceFields.join(', ')}, updated_at = NOW()
           WHERE product_id = $${pi++} AND price_book_id = $${pi}`,
          priceValues
        );
      }
    }

    // Atualiza estoque
    if (data.quantity !== undefined) {
      await client.query(
        `UPDATE inventory SET quantity = $1, updated_at = NOW() WHERE product_id = $2`,
        [data.quantity, productId]
      );
    }

    await client.query('COMMIT');
    const after = await getProduct(tenantId, productId);
    await auditLog({ tenantId, actor, action: 'update_product', entity: 'product', entityId: productId, before, after });
    return after;

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── PREÇO POR FORMA DE PAGAMENTO ──────────────
async function getProductPrice(tenantId, productId, paymentMethod = 'pix') {
  const product = await getProduct(tenantId, productId);
  if (!product) throw new Error('Produto não encontrado');

  if (product.available <= 0) {
    return { available: false, message: 'Produto sem estoque disponível' };
  }

  const response = {
    available: true,
    product_id: productId,
    model: `${product.model}${product.variant ? ' ' + product.variant : ''} ${product.storage || ''}`.trim(),
    condition: product.condition,
  };

  if (paymentMethod === 'pix' || paymentMethod === 'cash') {
    response.price = product.pix_price || product.current_price;
    response.payment_method = 'pix';
  } else if (paymentMethod === 'card' || paymentMethod === 'installments') {
    response.price = product.current_price;
    response.payment_method = 'card';
    response.installments = product.installments || [];
  } else {
    response.price = product.current_price;
    response.pix_price = product.pix_price;
    response.installments = product.installments || [];
  }

  return response;
}

// ─── VALIDAR DESCONTO ──────────────────────────
async function checkDiscount(tenantId, productId, proposedPrice) {
  const result = await query(
    `SELECT pp.min_price, pp.current_price
     FROM product_prices pp
     JOIN price_books pb ON pb.id = pp.price_book_id
     WHERE pp.product_id = $1 AND pp.tenant_id = $2 AND pb.name = 'default'`,
    [productId, tenantId]
  );

  if (result.rows.length === 0) throw new Error('Produto não encontrado');

  const { min_price, current_price } = result.rows[0];
  const approved = proposedPrice >= parseFloat(min_price);

  return {
    approved,
    proposed_price: proposedPrice,
    min_price: parseFloat(min_price),
    current_price: parseFloat(current_price),
    message: approved
      ? 'Desconto dentro do limite autorizado'
      : `Preço abaixo do mínimo permitido (R$ ${min_price})`,
  };
}

module.exports = { listProducts, getProduct, createProduct, updateProduct, getProductPrice, checkDiscount };
