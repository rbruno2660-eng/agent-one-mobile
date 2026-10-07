/**
 * Catálogo público da loja — /loja/[slug]
 * Sem autenticação. A IA pode enviar esse link via WhatsApp.
 */
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Search, Filter, X, ChevronDown, Package } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://agent-one-mobile-production.up.railway.app';

const CONDITION_LABEL = {
  novo: 'Novo',
  seminovo: 'Seminovo',
  usado: 'Usado',
  recondicionado: 'Recondicionado',
};

const CONDITION_COLOR = {
  novo: '#22c55e',
  seminovo: '#3b82f6',
  usado: '#f59e0b',
  recondicionado: '#8b5cf6',
};

function fmtPrice(price) {
  if (!price && price !== 0) return null;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
}

function ProductCard({ product }) {
  const condLabel = CONDITION_LABEL[product.condition] || product.condition;
  const condColor = CONDITION_COLOR[product.condition] || '#6b7280';
  const price = fmtPrice(product.price);
  const originalPrice = fmtPrice(product.original_price);
  const hasDiscount = product.original_price && product.price && product.original_price > product.price;
  const discountPct = hasDiscount
    ? Math.round((1 - product.price / product.original_price) * 100)
    : null;

  const image = product.images?.[0];

  return (
    <div style={{
      background: '#1a1f2e',
      border: '1px solid #2d3548',
      borderRadius: 16,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Imagem ou placeholder */}
      <div style={{
        height: 180,
        background: '#0f1219',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {image ? (
          <img src={image} alt={product.model} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Package size={48} color="#4b5563" />
        )}
        {discountPct && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: '#ef4444', color: '#fff',
            borderRadius: 8, padding: '2px 8px',
            fontSize: 12, fontWeight: 700,
          }}>-{discountPct}%</div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Condition badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          background: condColor + '22', color: condColor,
          borderRadius: 6, padding: '2px 8px',
          fontSize: 11, fontWeight: 600, width: 'fit-content',
        }}>{condLabel}</div>

        <div style={{ color: '#f3f4f6', fontWeight: 600, fontSize: 15, lineHeight: 1.3 }}>
          {product.model}
          {product.storage ? ` · ${product.storage}` : ''}
        </div>

        {product.variant && (
          <div style={{ color: '#9ca3af', fontSize: 12 }}>{product.variant}</div>
        )}
        {product.color && (
          <div style={{ color: '#6b7280', fontSize: 12 }}>Cor: {product.color}</div>
        )}

        {/* Preço */}
        <div style={{ marginTop: 'auto', paddingTop: 10 }}>
          {hasDiscount && (
            <div style={{ color: '#6b7280', fontSize: 12, textDecoration: 'line-through' }}>
              {originalPrice}
            </div>
          )}
          {price ? (
            <div style={{ color: '#22c55e', fontSize: 20, fontWeight: 700 }}>{price}</div>
          ) : (
            <div style={{ color: '#9ca3af', fontSize: 14 }}>Consulte o preço</div>
          )}
        </div>

        {product.description && (
          <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
            {product.description.length > 80
              ? product.description.slice(0, 80) + '…'
              : product.description}
          </div>
        )}

        {product.available > 0 && (
          <div style={{ color: '#4b5563', fontSize: 11, marginTop: 4 }}>
            {product.available} em estoque
          </div>
        )}
      </div>
    </div>
  );
}

export default function StoreCatalog({ slug }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const params = new URLSearchParams();
    if (search)    params.set('search', search);
    if (category)  params.set('category', category);
    if (condition) params.set('condition', condition);

    setLoading(true);
    fetch(`${API_URL}/public/catalog/${slug}?${params}`)
      .then(r => {
        if (!r.ok) throw new Error('Loja não encontrada');
        return r.json();
      })
      .then(d => { setData(d); setError(null); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, search, category, condition]);

  const store = data?.store || {};
  const products = data?.products || [];
  const categories = data?.categories || [];

  const CONDITION_OPTIONS = [
    { value: '', label: 'Todos' },
    { value: 'novo', label: 'Novo' },
    { value: 'seminovo', label: 'Seminovo' },
    { value: 'usado', label: 'Usado' },
    { value: 'recondicionado', label: 'Recondicionado' },
  ];

  return (
    <>
      <Head>
        <title>{store.name ? `${store.name} — Catálogo` : 'Catálogo'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{ minHeight: '100vh', background: '#0f1219', color: '#f3f4f6', fontFamily: 'system-ui, sans-serif' }}>

        {/* Header */}
        <div style={{
          background: '#1a1f2e',
          borderBottom: '1px solid #2d3548',
          padding: '20px 24px',
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            {loading && !store.name ? (
              <div style={{ color: '#6b7280', fontSize: 14 }}>Carregando…</div>
            ) : error ? null : (
              <>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f9fafb', marginBottom: 4 }}>
                  {store.name}
                </h1>
                {store.niche && (
                  <p style={{ fontSize: 13, color: '#9ca3af' }}>{store.niche}</p>
                )}
              </>
            )}
          </div>
        </div>

        {error ? (
          <div style={{ maxWidth: 400, margin: '80px auto', textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Loja não encontrada</h2>
            <p style={{ color: '#6b7280', fontSize: 14 }}>Verifique o link ou entre em contato com a loja.</p>
          </div>
        ) : (
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>

            {/* Barra de busca + filtros */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{
                flex: 1, minWidth: 200,
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#1a1f2e', border: '1px solid #2d3548',
                borderRadius: 10, padding: '8px 14px',
              }}>
                <Search size={15} color="#6b7280" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar produtos…"
                  style={{
                    background: 'transparent', border: 'none', outline: 'none',
                    color: '#f3f4f6', fontSize: 14, flex: 1,
                  }}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <X size={14} color="#6b7280" />
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowFilters(f => !f)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: showFilters ? '#2563eb' : '#1a1f2e',
                  border: '1px solid #2d3548',
                  borderRadius: 10, padding: '8px 14px',
                  color: '#f3f4f6', fontSize: 14, cursor: 'pointer',
                }}
              >
                <Filter size={14} /> Filtros <ChevronDown size={13} />
              </button>
            </div>

            {/* Filtros expandidos */}
            {showFilters && (
              <div style={{
                display: 'flex', gap: 10, flexWrap: 'wrap',
                background: '#1a1f2e', border: '1px solid #2d3548',
                borderRadius: 12, padding: '14px 16px', marginBottom: 20,
              }}>
                {/* Categoria */}
                {categories.length > 0 && (
                  <div>
                    <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 4 }}>Categoria</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      style={{
                        background: '#0f1219', border: '1px solid #2d3548', borderRadius: 8,
                        color: '#f3f4f6', padding: '6px 10px', fontSize: 13,
                      }}
                    >
                      <option value="">Todas</option>
                      {categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Condição */}
                <div>
                  <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 4 }}>Condição</label>
                  <select
                    value={condition}
                    onChange={e => setCondition(e.target.value)}
                    style={{
                      background: '#0f1219', border: '1px solid #2d3548', borderRadius: 8,
                      color: '#f3f4f6', padding: '6px 10px', fontSize: 13,
                    }}
                  >
                    {CONDITION_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Limpar */}
                {(category || condition) && (
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button
                      onClick={() => { setCategory(''); setCondition(''); }}
                      style={{
                        background: 'none', border: '1px solid #ef4444', borderRadius: 8,
                        color: '#ef4444', padding: '6px 12px', fontSize: 12, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <X size={12} /> Limpar
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Contagem */}
            {!loading && (
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
                {products.length === 0 ? 'Nenhum produto encontrado' : `${products.length} produto${products.length !== 1 ? 's' : ''}`}
              </div>
            )}

            {/* Grid de produtos */}
            {loading ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 16,
              }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{
                    background: '#1a1f2e', border: '1px solid #2d3548',
                    borderRadius: 16, height: 280, opacity: 0.4,
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
                <Package size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
                <p style={{ fontSize: 15 }}>Nenhum produto disponível no momento.</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 16,
              }}>
                {products.map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: 48, paddingBottom: 32, color: '#374151', fontSize: 12 }}>
              Catálogo gerado pelo Agent One
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: #6b7280; }
      `}</style>
    </>
  );
}

// Slug vem da URL pelo Next.js
export async function getServerSideProps({ params }) {
  return { props: { slug: params.slug } };
}
