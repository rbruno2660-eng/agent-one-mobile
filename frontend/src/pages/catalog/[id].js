import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Package, Minus, Plus, Save } from 'lucide-react';

function formatBRL(v) {
  return v != null ? `R$ ${parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>{label}</label>
      <input {...props} className="w-full px-3 py-2.5 rounded-xl text-sm text-white border outline-none focus:border-blue-500 transition"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }} />
    </div>
  );
}

export default function ProductEditPage() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estoque
  const [newQty, setNewQty] = useState(0);
  const [reason, setReason] = useState('');
  const [savingStock, setSavingStock] = useState(false);

  // Preço
  const [price, setPrice] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/products/${id}`)
      .then(r => {
        setProduct(r.data);
        setNewQty(r.data.available ?? 0);
        setPrice(r.data.current_price ?? '');
        setMinPrice(r.data.min_price ?? '');
      })
      .catch(() => toast.error('Produto não encontrado'))
      .finally(() => setLoading(false));
  }, [id]);

  async function saveStock() {
    if (newQty < 0) return toast.error('Estoque não pode ser negativo');
    setSavingStock(true);
    try {
      await api.patch(`/products/${id}/inventory`, { quantity: newQty, reason: reason || 'Ajuste manual' });
      toast.success('Estoque atualizado!');
      setProduct(p => ({ ...p, available: newQty }));
      setReason('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar estoque');
    } finally {
      setSavingStock(false);
    }
  }

  async function savePrice() {
    setSavingPrice(true);
    try {
      await api.patch(`/products/${id}`, {
        current_price: parseFloat(price),
        min_price: parseFloat(minPrice),
      });
      toast.success('Preço atualizado!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar preço');
    } finally {
      setSavingPrice(false);
    }
  }

  if (loading) return (
    <div className="p-8 text-sm text-center" style={{ color: 'var(--muted)' }}>Carregando...</div>
  );

  if (!product) return (
    <div className="p-8 text-sm text-center" style={{ color: 'var(--muted)' }}>Produto não encontrado.</div>
  );

  const delta = newQty - (product.available ?? 0);

  return (
    <div className="p-8 max-w-xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl border transition hover:bg-white/5"
          style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">
            {product.model}{product.variant ? ` ${product.variant}` : ''}{product.storage ? ` ${product.storage}` : ''}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {product.condition === 'new' ? 'Novo' : 'Seminovo'}{product.color ? ` · ${product.color}` : ''}
          </p>
        </div>
      </div>

      {/* Estoque */}
      <div className="rounded-2xl border p-5 mb-4" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Package size={16} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-white">Estoque</h2>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => setNewQty(q => Math.max(0, q - 1))}
            className="w-10 h-10 rounded-xl border flex items-center justify-center transition hover:bg-white/5"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
            <Minus size={16} />
          </button>

          <div className="flex-1 text-center">
            <input
              type="number"
              min="0"
              value={newQty}
              onChange={e => setNewQty(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-24 text-center text-2xl font-bold text-white bg-transparent border-b-2 outline-none pb-1"
              style={{ borderColor: 'var(--border)' }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
              {delta !== 0 && (
                <span style={{ color: delta > 0 ? '#4ade80' : '#f87171' }}>
                  {delta > 0 ? `+${delta}` : delta} em relação ao atual ({product.available ?? 0})
                </span>
              )}
              {delta === 0 && 'unidades em estoque'}
            </p>
          </div>

          <button
            onClick={() => setNewQty(q => q + 1)}
            className="w-10 h-10 rounded-xl border flex items-center justify-center transition hover:bg-white/5"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
            <Plus size={16} />
          </button>
        </div>

        <Field
          label="Motivo do ajuste (opcional)"
          placeholder="Ex: Recebimento de mercadoria, Perda, Inventário"
          value={reason}
          onChange={e => setReason(e.target.value)}
        />

        <button
          onClick={saveStock}
          disabled={savingStock || delta === 0}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition"
          style={{ background: 'var(--primary)' }}>
          <Save size={14} />
          {savingStock ? 'Salvando...' : 'Salvar estoque'}
        </button>
      </div>

      {/* Preços */}
      <div className="rounded-2xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
        <h2 className="text-sm font-semibold text-white mb-4">Preços</h2>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Field
            label="Preço atual (R$)"
            type="number"
            step="0.01"
            placeholder="Ex: 3999.99"
            value={price}
            onChange={e => setPrice(e.target.value)}
          />
          <Field
            label="Preço mínimo (R$)"
            type="number"
            step="0.01"
            placeholder="Ex: 3600.00"
            value={minPrice}
            onChange={e => setMinPrice(e.target.value)}
          />
        </div>
        <div className="text-xs mb-4 space-y-0.5" style={{ color: 'var(--muted)' }}>
          <p>Preço atual: <span className="text-white font-medium">{formatBRL(product.current_price)}</span></p>
          <p>Preço mínimo: <span className="text-white font-medium">{formatBRL(product.min_price)}</span></p>
        </div>
        <button
          onClick={savePrice}
          disabled={savingPrice}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition"
          style={{ background: 'var(--primary)' }}>
          <Save size={14} />
          {savingPrice ? 'Salvando...' : 'Salvar preços'}
        </button>
      </div>
    </div>
  );
}

ProductEditPage.getLayout = (page) => <Layout>{page}</Layout>;
