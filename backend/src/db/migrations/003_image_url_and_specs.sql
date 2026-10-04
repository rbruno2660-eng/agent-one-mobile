-- Migration 003: Catálogo Visual e specs de produto
-- Rodar no Neon via psql ou Railway DB console

-- Adiciona image_url na tabela products (se ainda não existir)
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Índice para buscas por image_url preenchido (útil para listar produtos sem foto)
CREATE INDEX IF NOT EXISTS idx_products_image_url ON products(tenant_id) WHERE image_url IS NOT NULL;
