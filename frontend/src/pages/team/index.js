import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { UserPlus, Users, Phone } from 'lucide-react';

const ROLES = ['manager', 'seller', 'service', 'viewer'];

function Field({ label, ...props }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>{label}</label>
      <input {...props} className="w-full px-3 py-2.5 rounded-xl text-sm text-white border outline-none" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }} />
    </div>
  );
}

export default function TeamPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'seller' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  function loadUsers() {
    api.get('/users').then(r => setUsers(r.data)).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => { loadUsers(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return toast.error('Preencha todos os campos');
    setSaving(true);
    try {
      await api.post('/users', form);
      toast.success('Membro adicionado!');
      setForm({ name: '', email: '', password: '', phone: '', role: 'seller' });
      setShowForm(false);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao criar usuário');
    } finally {
      setSaving(false);
    }
  }

  const roleColor = {
    manager: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
    seller:  { bg: 'rgba(34,197,94,0.15)',  color: '#4ade80' },
    service: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
    viewer:  { bg: 'rgba(148,163,184,0.15)',color: '#94a3b8' },
  };

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users size={20} className="text-blue-400" />
          <h1 className="text-xl font-bold text-white">Equipe</h1>
          {!loading && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>{users.length} membros</span>}
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition"
          style={{ background: showForm ? 'var(--bg2)' : 'var(--primary)', border: showForm ? '1px solid var(--border)' : 'none' }}>
          <UserPlus size={14} />
          {showForm ? 'Cancelar' : 'Adicionar membro'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl border p-5 mb-6" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-semibold text-white mb-4">Novo membro</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome completo" placeholder="Ex: João Silva" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              <Field label="E-mail" type="email" placeholder="email@loja.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="WhatsApp (com DDI)" placeholder="5511999990000" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))} />
              <Field label="Senha temporária" type="password" placeholder="Mín. 8 caracteres" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Função</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white border outline-none"
                style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition"
              style={{ background: 'var(--primary)' }}>
              {saving ? 'Criando...' : 'Criar membro'}
            </button>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              {['Nome', 'E-mail', 'WhatsApp', 'Função', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-xs" style={{ color: 'var(--muted)' }}>Carregando...</td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-xs" style={{ color: 'var(--muted)' }}>Nenhum membro ainda</td></tr>
            )}
            {users.map(u => (
              <tr key={u.id} className="border-b hover:bg-white/[0.02] transition" style={{ borderColor: 'var(--border)' }}>
                <td className="px-4 py-3 text-white font-medium">{u.name}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{u.email}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>
                  {u.phone
                    ? <span className="flex items-center gap-1"><Phone size={10} />{u.phone}</span>
                    : <span style={{ opacity: 0.4 }}>—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={roleColor[u.role] || roleColor.viewer}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: u.active ? '#4ade80' : '#f87171' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: u.active ? '#4ade80' : '#f87171' }} />
                    {u.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

TeamPage.getLayout = (page) => <Layout>{page}</Layout>;
