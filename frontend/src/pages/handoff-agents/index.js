import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { UserPlus, Phone, Trash2, Check, X } from 'lucide-react';

function formatPhone(phone) {
  if (!phone) return '—';
  const d = phone.replace(/\D/g, '');
  if (d.length === 13) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,8)}-${d.slice(8)}`;
  return phone;
}

export default function HandoffAgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });

  function load() {
    setLoading(true);
    api.get('/handoff-agents')
      .then(r => setAgents(r.data))
      .catch(() => toast.error('Erro ao carregar atendentes'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return toast.error('Preencha nome e telefone');
    setSaving(true);
    try {
      await api.post('/handoff-agents', form);
      toast.success('Atendente adicionado!');
      setForm({ name: '', phone: '' });
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(agent) {
    try {
      await api.patch(`/handoff-agents/${agent.id}`, { active: !agent.active });
      load();
    } catch { toast.error('Erro ao atualizar'); }
  }

  async function remove(agent) {
    if (!confirm(`Remover "${agent.name}"?`)) return;
    try {
      await api.delete(`/handoff-agents/${agent.id}`);
      toast.success('Atendente removido');
      load();
    } catch { toast.error('Erro ao remover'); }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-bold text-white">Atendentes de Handoff</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            Quando o agente acionar um humano, esses números receberão uma notificação via WhatsApp.
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition"
          style={{ background: showForm ? 'var(--bg2)' : 'var(--primary)', border: showForm ? '1px solid var(--border)' : 'none' }}
        >
          <UserPlus size={14} />
          {showForm ? 'Cancelar' : 'Adicionar atendente'}
        </button>
      </div>

      {/* Aviso de fallback */}
      {!loading && agents.length === 0 && (
        <div className="mt-4 mb-6 px-4 py-3 rounded-xl text-xs" style={{ background: '#f59e0b18', border: '1px solid #f59e0b40', color: '#fbbf24' }}>
          ⚠️ Nenhum atendente cadastrado. Ao ocorrer um handoff, o sistema notificará managers/admins que tenham telefone preenchido no cadastro de Equipe.
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl border p-5 mb-6 mt-4" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-semibold text-white mb-4">Novo atendente</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Nome</label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: João Silva"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white border outline-none"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>WhatsApp (com DDI)</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="5511999999999"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white border outline-none"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
                />
              </div>
            </div>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Informe o número completo com DDI (55 para Brasil) e DDD, sem espaços ou traços. Ex: 5511987654321
            </p>
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm border" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>Cancelar</button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--primary)' }}>
                {saving ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="py-12 text-center text-sm" style={{ color: 'var(--muted)' }}>Carregando...</div>
      ) : agents.length === 0 ? (
        <div className="py-16 text-center">
          <Phone size={36} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--muted)' }} />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Nenhum atendente cadastrado ainda</p>
          <button onClick={() => setShowForm(true)} className="mt-4 px-4 py-2 rounded-xl text-sm text-white" style={{ background: 'var(--primary)' }}>
            Adicionar primeiro atendente
          </button>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          {agents.map((agent, i) => (
            <div
              key={agent.id}
              className="flex items-center justify-between px-5 py-4"
              style={{
                background: i % 2 === 0 ? 'var(--bg2)' : 'var(--bg)',
                borderBottom: i < agents.length - 1 ? '1px solid var(--border)' : 'none',
                opacity: agent.active ? 1 : 0.5,
              }}
            >
              <div>
                <div className="text-sm font-semibold text-white">{agent.name}</div>
                <div className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--muted)' }}>
                  <Phone size={11} />
                  {formatPhone(agent.phone)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs px-2 py-0.5 rounded-md"
                  style={{
                    background: agent.active ? 'rgba(34,197,94,0.15)' : 'rgba(100,116,139,0.15)',
                    color: agent.active ? '#4ade80' : '#64748b',
                  }}
                >
                  {agent.active ? 'Ativo' : 'Inativo'}
                </span>
                <button
                  onClick={() => toggleActive(agent)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition"
                  title={agent.active ? 'Desativar' : 'Ativar'}
                >
                  {agent.active ? <X size={14} className="text-red-400" /> : <Check size={14} className="text-green-400" />}
                </button>
                <button
                  onClick={() => remove(agent)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

HandoffAgentsPage.getLayout = (page) => <Layout>{page}</Layout>;
