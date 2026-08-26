const { query, getClient } = require('../db/pool');

/**
 * Busca ou cria um contato pelo número de telefone.
 */
async function findOrCreateContact(tenantId, phone, name = null) {
  // tenta buscar
  const existing = await query(
    `SELECT * FROM contacts WHERE tenant_id = $1 AND phone = $2`,
    [tenantId, phone]
  );
  if (existing.rows.length > 0) {
    // atualiza nome se vier do WhatsApp e o atual estiver vazio
    if (name && !existing.rows[0].name) {
      await query(`UPDATE contacts SET name = $1, updated_at = NOW() WHERE id = $2`, [name, existing.rows[0].id]);
      existing.rows[0].name = name;
    }
    return existing.rows[0];
  }

  const result = await query(
    `INSERT INTO contacts (tenant_id, phone, name) VALUES ($1,$2,$3) RETURNING *`,
    [tenantId, phone, name || null]
  );
  return result.rows[0];
}

/**
 * Busca conversa aberta para o contato ou cria uma nova.
 */
async function findOrCreateConversation(tenantId, contactId, source = 'whatsapp') {
  // Conversa ativa existe?
  const existing = await query(
    `SELECT * FROM conversations
     WHERE tenant_id = $1 AND contact_id = $2
       AND status NOT IN ('closed')
     ORDER BY created_at DESC LIMIT 1`,
    [tenantId, contactId]
  );
  if (existing.rows.length > 0) return existing.rows[0];

  const result = await query(
    `INSERT INTO conversations (tenant_id, contact_id, status, source)
     VALUES ($1,$2,'new',$3) RETURNING *`,
    [tenantId, contactId, source]
  );
  return result.rows[0];
}

/**
 * Persiste uma mensagem. Retorna null se duplicada (idempotência por provider_id).
 */
async function saveMessage({ conversationId, tenantId, direction, type, content, providerId, metadata = {} }) {
  // Idempotência: se provider_id já existe, ignora
  if (providerId) {
    const dup = await query(`SELECT id FROM messages WHERE provider_id = $1`, [providerId]);
    if (dup.rows.length > 0) return null;
  }

  const result = await query(
    `INSERT INTO messages (conversation_id, tenant_id, direction, type, content, provider_id, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [conversationId, tenantId, direction, type, content, providerId || null, JSON.stringify(metadata)]
  );

  // Atualiza last_message_at na conversa
  await query(
    `UPDATE conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [conversationId]
  );

  return result.rows[0];
}

/**
 * Atualiza o status de uma conversa.
 */
async function updateConversationStatus(conversationId, status, assignedUserId = undefined) {
  const fields = ['status = $1', 'updated_at = NOW()'];
  const values = [status];

  if (assignedUserId !== undefined) {
    fields.push(`assigned_user_id = $${values.length + 1}`);
    values.push(assignedUserId);
  }

  values.push(conversationId);
  await query(
    `UPDATE conversations SET ${fields.join(', ')} WHERE id = $${values.length}`,
    values
  );
}

/**
 * Lista conversas de um tenant com filtros.
 */
async function listConversations(tenantId, filters = {}) {
  const conditions = ['c.tenant_id = $1'];
  const values = [tenantId];
  let i = 2;

  if (filters.status) { conditions.push(`c.status = $${i++}`); values.push(filters.status); }
  if (filters.assignedTo) { conditions.push(`c.assigned_user_id = $${i++}`); values.push(filters.assignedTo); }

  const result = await query(`
    SELECT
      c.*,
      ct.name AS contact_name,
      ct.phone AS contact_phone,
      (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message
    FROM conversations c
    JOIN contacts ct ON ct.id = c.contact_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY c.last_message_at DESC NULLS LAST
    LIMIT 100
  `, values);

  return result.rows;
}

/**
 * Busca conversa com histórico de mensagens.
 */
async function getConversation(tenantId, conversationId) {
  const convResult = await query(`
    SELECT c.*, ct.name AS contact_name, ct.phone AS contact_phone
    FROM conversations c
    JOIN contacts ct ON ct.id = c.contact_id
    WHERE c.id = $1 AND c.tenant_id = $2
  `, [conversationId, tenantId]);

  if (convResult.rows.length === 0) return null;

  const messages = await query(
    `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 200`,
    [conversationId]
  );

  return { ...convResult.rows[0], messages: messages.rows };
}

module.exports = {
  findOrCreateContact,
  findOrCreateConversation,
  saveMessage,
  updateConversationStatus,
  listConversations,
  getConversation,
};
