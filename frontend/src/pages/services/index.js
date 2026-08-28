import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Plus, Pencil, X, Check, Trash2 } from 'lucide-react';

const emptyForm = { name: '', description: '', price: '', min_price: '', warranty_days: '90', turnaround_days: '1', compatible_with: '' };

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // null = new, id = editing
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  async function fetchServices() {
    const r = await api.get('/services').catch(() => ({ data: [] }));
    setServices(r.data);
  }

  useEffect(() => { fetchServices(); }, []);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(svc) {
    setEditing(svc.id);
    setForm({
      name: svc.name || '',
      description: svc.description || '',
      price: svc.price ?? '',
      min_price: svc.min_price ?? '',
      warranty_days: svc.warranty_days ?? '90',
      turnaround_days: svc.turnaround_days ?? '1',
      compatible_with: (svc.compatible_with || []).join(', '),
    });
    setShowForm(true);
  }

  function field(key, value) {
    setForm(p => ({ ...p, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.price || !form.min_price) return toast.error('Preencha nome, preço e preço mínimo');
    if (parseFloat(form.min_price) > parseFloat(form.price)) return toast.error('Preço mínimo não pode ser maior que o preço');

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        price: parseFloat(form.price),
        min_price: parseFloat(form.min_price),
        warranty_days: parseInt(form.warranty_days) || 90,
        turnaround_days: parseInt(form.turnaround_days) || 1,
        compatible_with: form.compatible_with ? form.compatible_with.split(',').map(s => s.trim()).filter(Boolean) : [],
      };

      if (editing) {
        await api.patch(`/services/${editing}`, payload);
        toast.success('Serviço atualizado');
      } else {
        await api.post('/services', payload);
        toast.success('Serviço criado');
      }
      setShowForm(false);
      fetchServices();
    } catch {
      toast.error('Erro ao salvar serviço');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(svc) {
    try {
      await api.patch(`/services/${svc.id}`, { active: !svc.active });
      fetchServices();
    } catch { toast.error('Erro ao atualizar'); }
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Excluir ${selected.size} serviço(s)? Esta ação não pode ser desfeita.`)) return;
    setDeleting(true);
    try {
      await Promise.all([...selected].map(id => api.delete(`/services/${id}`)));
      toast.success(`${selected.size} serviço(s) excluído(s)`);
      setSelected(new Set());
      fetchServices();
    } catch {
      toast.error('Erro ao excluir serviços');
    } finally {
      setDeleting(false);
    }
  }

  function formatBRL(v) {
    return v != null ? `R$ ${parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-white">Serviços</h1>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--primary)' }}>
          <Plus size={14} /> Novo serviço
        </button>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-5 px-4 py-3 rounded-xl" style={{ background: '#dc262620', border: '1px solid #dc262640' }}>
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

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-base font-semibold text-white">{editing ? 'Editar serviço' : 'Novo serviço'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Nome do serviço *</label>
                <input value={form.name} onChange={e => field('name', e.target.value)} placeholder="Ex: Troca de tela iPhone 12" className="w-full px-3 py-2.5 rounded-xl text-sm text-white border outline-none" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }} />
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Descrição</label>
                <textarea value={form.description} onChange={e => field('description', e.target.value)} rows={2} placeholder="Detalhes do serviço..." className="w-full px-3 py-2.5 rounded-xl text-sm text-white border outline-none resize-none" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Preço (R$) *</label>
                  <input type="number" step="0.01" value={form.price} onChange={e => field('price', e.target.value)} placeholder="0,00" className="w-full px-3 py-2.5 rounded-xl text-sm text-white border outline-none" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Preço mínimo (R$) *</label>
                  <input type="number" step="0.01" value={form.min_price} onChange={e => field('min_price', e.target.value)} placeholder="0,00" className="w-full px-3 py-2.5 rounded-xl text-sm text-white border outline-none" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Garantia (dias)</label>
                  <input type="number" value={form.warranty_days} onChange={e => field('warranty_days', e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm text-white border outline-none" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Prazo (dias úteis)</label>
                  <input type="number" value={form.turnaround_days} onChange={e => field('turnaround_days', e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm text-white border outline-none" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }} />
                </div>
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Compatível com (modelos, separados por vírgula)</label>
                <input value={form.compatible_with} onChange={e => field('compatible_with', e.target.value)} placeholder="iPhone 11, iPhone 12, iPhone 13" className="w-full px-3 py-2.5 rounded-xl text-sm text-white border outline-none" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm border" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--primary)' }}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map(svc => (
          <div key={svc.id} className={`rounded-2xl p-5 border transition relative ${!svc.active ? 'opacity-50' : ''}`} style={{ background: 'var(--bg2)', borderColor: selected.has(svc.id) ? '#dc2626' : 'var(--border)' }}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2 flex-1 pr-2">
                <input
                  type="checkbox"
                  checked={selected.has(svc.id)}
                  onChange={() => toggleSelect(svc.id)}
                  className="rounded cursor-pointer flex-shrink-0"
                  style={{ accentColor: '#dc2626' }}
                />
                <h3 className="text-white font-semibold text-sm leading-snug">{svc.name}</h3>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(svc)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"><Pencil size={13} /></button>
                <button onClick={() => toggleActive(svc)} className="p-1.5 rounded-lg hover:bg-white/10 transition" title={svc.active ? 'Desativar' : 'Ativar'}>
                  {svc.active ? <Check size={13} className="text-green-400" /> : <X size={13} className="text-red-400" />}
                </button>
              </div>
            </div>

            {svc.description && <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--muted)' }}>{svc.description}</p>}

            <div className="flex justify-between items-end">
              <div>
                <div className="text-white font-bold">{formatBRL(svc.price)}</div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>mín: {formatBRL(svc.min_price)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs" style={{ color: 'var(--muted)' }}>Prazo: {svc.turnaround_days}d</div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>Garantia: {svc.warranty_days}d</div>
              </div>
            </div>

            {svc.compatible_with && svc.compatible_with.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {svc.compatible_with.slice(0, 3).map(m => (
                  <span key={m} className="text-xs px-2 py-0.5 rounded-md" style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' }}>{m}</span>
                ))}
                {svc.compatible_with.length > 3 && (
                  <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' }}>+{svc.compatible_with.length - 3}</span>
                )}
              </div>
            )}
          </div>
        ))}

        {services.length === 0 && (
          <div className="col-span-3 py-16 text-center">
            <div className="text-4xl mb-3">🔧</div>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Nenhum serviço cadastrado</p>
            <button onClick={openNew} className="mt-4 px-4 py-2 rounded-xl text-sm text-white" style={{ background: 'var(--primary)' }}>Cadastrar primeiro serviço</button>
          </div>
        )}
      </div>
    </div>
  );
}

ServicesPage.getLayout = (page) => <Layout>{page}</Layout>;
