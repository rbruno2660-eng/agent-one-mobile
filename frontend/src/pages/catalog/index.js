import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Plus, Search, Package, AlertTriangle, Trash2 } from 'lucide-react';
import clsx from 'clsx';

function Badge({ children, color = '#2563eb' }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: color + '22', color }}>
      {children}
    </span>
  );
}

function formatBRL(value) {
  return value != null ? `R$ ${parseFloat(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';
}

export default function CatalogPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  async function fetchProducts() {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'all') params.condition = filter;
      const { data } = await api.get('/products', { params });
      setProducts(data);
      setSelected(new Set());
    } catch {
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchProducts(); }, [filter]);

  const filtered = products.filter(p =>
    `${p.model} ${p.variant || ''} ${p.storage || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  async function toggleActive(product) {
    try {
      await api.patch(`/products/${product.id}/toggle`);
      await fetchProducts();
      toast.success(product.active ? 'Produto desativado' : 'Produto ativado');
    } catch {
      toast.error('Erro ao alterar produto');
    }
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(p => p.id)));
    }
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Excluir ${selected.size} produto(s)? Esta ação não pode ser desfeita.`)) return;
    setDeleting(true);
    try {
      await Promise.all([...selected].map(id => api.delete(`/products/${id}`)));
      toast.success(`${selected.size} produto(s) excluído(s)`);
      await fetchProducts();
    } catch {
      toast.error('Erro ao excluir produtos');
    } finally {
      setDeleting(false);
    }
  }

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const someSelected = selected.size > 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Catálogo</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{products.length} produto(s) cadastrado(s)</p>
        </div>
        <button
          onClick={() => router.push('/catalog/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition"
          style={{ background: 'var(--primary)' }}
        >
          <Plus size={16} /> Novo produto
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input
            type="text"
            placeholder="Buscar modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white border outline-none focus:border-blue-500 transition"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          />
        </div>
        {['all','new','used'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx('px-4 py-2 rounded-xl text-sm font-medium transition', filter === f ? 'bg-blue-600 text-white' : 'border hover:bg-white/5')}
            style={filter !== f ? { borderColor: 'var(--border)', color: 'var(--muted)' } : {}}
          >
            {{ all: 'Todos', new: 'Novos', used: 'Seminovos' }[f]}
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl" style={{ background: '#dc262620', border: '1px solid #dc262640' }}>
          <span className="text-sm text-white font-medium">{selected.size} selecionado(s)</span>
          <button
            onClick={deleteSelected}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition"
            style={{ background: '#dc2626' }}
          >
            <Trash2 size={13} /> {deleting ? 'Excluindo...' : 'Excluir selecionados'}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-sm ml-auto" style={{ color: 'var(--muted)' }}>Cancelar</button>
        </div>
      )}

      {/* Tabela */}
      {loading ? (
        <div className="text-sm text-center py-12" style={{ color: 'var(--muted)' }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--muted)' }} />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Nenhum produto encontrado</p>
          <button onClick={() => router.push('/catalog/new')} className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--primary)' }}>
            Cadastrar primeiro produto
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-sm" style={{ minWidth: 700 }}>
            <thead>
              <tr className="border-b" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="rounded cursor-pointer"
                    style={{ accentColor: 'var(--primary)' }}
                  />
                </th>
                {['Modelo', 'Condição', 'Preço atual', 'Mín.', 'Estoque', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: 'var(--muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr
                  key={p.id}
                  className="border-b hover:bg-white/[0.02] transition"
                  style={{ borderColor: 'var(--border)', background: selected.has(p.id) ? 'rgba(220,38,38,0.05)' : undefined }}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="rounded cursor-pointer"
                      style={{ accentColor: 'var(--primary)' }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">
                      {p.model}{p.variant ? ` ${p.variant}` : ''}{p.storage ? ` ${p.storage}` : ''}
                    </div>
                    {p.color && <div className="text-xs" style={{ color: 'var(--muted)' }}>{p.color}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={p.condition === 'new' ? '#059669' : '#7c3aed'}>
                      {p.condition === 'new' ? 'Novo' : 'Seminovo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{formatBRL(p.current_price)}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{formatBRL(p.min_price)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {(p.available || 0) === 0 && <AlertTriangle size={12} className="text-red-400" />}
                      <span className={p.available > 0 ? 'text-white' : 'text-red-400'}>
                        {p.available ?? 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={p.active ? '#059669' : '#6b7280'}>
                      {p.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/catalog/${p.id}`)}
                        className="text-xs px-3 py-1.5 rounded-lg border transition hover:bg-white/5"
                        style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleActive(p)}
                        className="text-xs px-3 py-1.5 rounded-lg border transition hover:bg-white/5"
                        style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                      >
                        {p.active ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

CatalogPage.getLayout = (page) => <Layout>{page}</Layout>;
