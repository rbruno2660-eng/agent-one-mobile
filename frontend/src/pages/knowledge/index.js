import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, ChevronLeft } from 'lucide-react';

const CATEGORIES = [
  { key: 'faq', label: '❓ FAQ', color: '#3b82f6' },
  { key: 'policy', label: '📋 Política', color: '#8b5cf6' },
  { key: 'promotions', label: '🎁 Promoções', color: '#f59e0b' },
  { key: 'warranty', label: '🛡️ Garantia', color: '#10b981' },
  { key: 'payment', label: '💳 Pagamento', color: '#06b6d4' },
  { key: 'trade', label: '🔄 Troca', color: '#ec4899' },
  { key: 'service', label: '🔧 Manutenção', color: '#f97316' },
  { key: 'other', label: '📦 Outros', color: '#6b7280' },
];

function catInfo(key) {
  return CATEGORIES.find(c => c.key === key) || { label: key, color: '#6b7280' };
}

const emptyForm = { title: '', content: '', category: 'faq' };

export default function KnowledgePage() {
  const [docs, setDocs] = useState([]);
  const [filterCat, setFilterCat] = useState('');
  const [view, setView] = useState('list'); // 'list' | 'edit' | 'new'
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function fetchDocs() {
    const params = filterCat ? `?category=${filterCat}` : '';
    const r = await api.get(`/knowledge${params}`).catch(() => ({ data: [] }));
    setDocs(r.data);
  }

  useEffect(() => { fetchDocs(); }, [filterCat]);

  async function openEdit(doc) {
    const r = await api.get(`/knowledge/${doc.id}`).catch(() => null);
    if (!r) return toast.error('Erro ao carregar documento');
    setEditing(r.data);
    setForm({ title: r.data.title, content: r.data.content, category: r.data.category });
    setView('edit');
  }

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setView('new');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title || !form.content) return toast.error('Preencha título e conteúdo');
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/knowledge/${editing.id}`, form);
        toast.success('Documento atualizado');
      } else {
        await api.post('/knowledge', form);
        toast.success('Documento criado');
      }
      setView('list');
      fetchDocs();
    } catch {
      toast.error('Erro ao salvar documento');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/knowledge/${id}`);
      toast.success('Documento removido');
      setConfirmDelete(null);
      fetchDocs();
    } catch {
      toast.error('Erro ao remover');
    }
  }

  async function toggleActive(doc) {
    try {
      await api.patch(`/knowledge/${doc.id}`, { active: !doc.active });
      fetchDocs();
    } catch { toast.error('Erro ao atualizar'); }
  }

  // ── List view ──
  if (view === 'list') return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Base de Conhecimento</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>O agente consulta esses documentos para responder perguntas</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--primary)' }}>
          <Plus size={14} /> Novo documento
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button onClick={() => setFilterCat('')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${!filterCat ? 'text-white bg-blue-600 border-transparent' : 'border-transparent hover:bg-white/5'}`}
          style={{ color: filterCat ? 'var(--muted)' : undefined, border: filterCat ? '1px solid var(--border)' : undefined }}>
          Todos
        </button>
        {CATEGORIES.map(c => (
          <button key={c.key} onClick={() => setFilterCat(filterCat === c.key ? '' : c.key)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium border transition"
            style={{
              background: filterCat === c.key ? c.color + '22' : 'transparent',
              borderColor: filterCat === c.key ? c.color + '55' : 'var(--border)',
              color: filterCat === c.key ? c.color : 'var(--muted)',
            }}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Docs grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {docs.map(doc => {
          const cat = catInfo(doc.category);
          return (
            <div key={doc.id} className={`rounded-2xl p-4 border transition ${!doc.active ? 'opacity-50' : ''}`}
              style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <div className="flex justify-between items-start mb-2">
                <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: cat.color + '22', color: cat.color }}>
                  {cat.label}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(doc)} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => setConfirmDelete(doc)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <h3 className="text-white font-medium text-sm mt-2 mb-1 line-clamp-2">{doc.title}</h3>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{doc.chars} caracteres</p>
              <div className="flex justify-between items-center mt-3">
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  {new Date(doc.updated_at).toLocaleDateString('pt-BR')}
                </span>
                <button onClick={() => toggleActive(doc)} className="text-xs px-2 py-1 rounded-md border transition"
                  style={{ borderColor: doc.active ? '#22c55e44' : 'var(--border)', color: doc.active ? '#22c55e' : 'var(--muted)', background: doc.active ? '#22c55e11' : 'transparent' }}>
                  {doc.active ? 'Ativo' : 'Inativo'}
                </button>
              </div>
            </div>
          );
        })}
        {docs.length === 0 && (
          <div className="col-span-3 py-16 text-center">
            <div className="text-4xl mb-3">📚</div>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Nenhum documento ainda</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Adicione FAQs, políticas e promoções para o agente usar</p>
            <button onClick={openNew} className="mt-4 px-4 py-2 rounded-xl text-sm text-white" style={{ background: 'var(--primary)' }}>Criar primeiro documento</button>
          </div>
        )}
      </div>

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <h3 className="text-base font-semibold text-white mb-2">Remover documento?</h3>
            <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>"{confirmDelete.title}" será removido permanentemente.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-xl text-sm border" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete.id)} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 transition">Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Editor view ──
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <button onClick={() => setView('list')} className="flex items-center gap-1.5 text-sm mb-6 hover:text-white transition" style={{ color: 'var(--muted)' }}>
        <ChevronLeft size={16} /> Voltar
      </button>

      <h1 className="text-xl font-bold text-white mb-6">{view === 'edit' ? 'Editar documento' : 'Novo documento'}</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Título *</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Política de troca e devolução"
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white border outline-none" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Categoria</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white border outline-none" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Conteúdo *</label>
          <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
            Escreva de forma clara e direta — o agente vai usar este texto para responder clientes.
          </p>
          <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
            rows={16} placeholder="Ex: Nossa política de troca é...&#10;&#10;Aceitamos trocas em até 7 dias desde que:&#10;- O produto esteja em perfeito estado&#10;- Acompanhe nota fiscal"
            className="w-full px-4 py-3 rounded-xl text-sm text-white border outline-none resize-none font-mono"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)', lineHeight: '1.6' }} />
          <div className="flex justify-end mt-1">
            <span className="text-xs" style={{ color: 'var(--muted)' }}>{form.content.length} caracteres</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => setView('list')} className="px-4 py-2.5 rounded-xl text-sm border" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>Cancelar</button>
          <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--primary)' }}>
            {saving ? 'Salvando...' : 'Salvar documento'}
          </button>
        </div>
      </form>
    </div>
  );
}

KnowledgePage.getLayout = (page) => <Layout>{page}</Layout>;
