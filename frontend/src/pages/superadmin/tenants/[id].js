import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import api from '../../../lib/api';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  active:    { label: 'Ativo',     bg: '#16a34a22', color: '#4ade80' },
  suspended: { label: 'Suspenso',  bg: '#ca8a0422', color: '#facc15' },
  cancelled: { label: 'Cancelado', bg: '#dc262622', color: '#f87171' },
};

const ROLE_LABEL = {
  owner: 'Owner', admin: 'Admin', manager: 'Gerente',
  seller: 'Vendedor', service: 'Atendente', viewer: 'Visualizador',
};

export default function TenantDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resetPass, setResetPass] = useState('');
  const [resetting, setResetting] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activateForm, setActivateForm] = useState({ phone_id: '', phone_number: '', whatsapp_token: '' });

  useEffect(() => {
    const user = (() => { try { return JSON.parse(localStorage.getItem('sa_user') || 'null'); } catch { return null; } })();
    if (!user?.isSuperAdmin) { router.replace('/superadmin/login'); return; }
    if (id) fetchData();
  }, [id]);

  async function handleActivate(e) {
    e.preventDefault();
    if (!activateForm.phone_id || !activateForm.phone_number || !activateForm.whatsapp_token) {
      toast.error('Preencha todos os campos');
      return;
    }
    setActivating(true);
    try {
      await api.post(`/superadmin/tenants/${id}/activate`, {
        phone_id: activateForm.phone_id.trim(),
        phone_number: activateForm.phone_number.trim(),
        whatsapp_token: activateForm.whatsapp_token.trim(),
      });
      toast.success('✅ Cliente ativado! Canal WhatsApp configurado.');
      setActivateForm({ phone_id: '', phone_number: '', whatsapp_token: '' });
      fetchData();
    } catch {
      toast.error('Erro ao ativar cliente');
    } finally {
      setActivating(false);
    }
  }

  async function fetchData() {
    try {
      const { data: d } = await api.get(`/superadmin/tenants/${id}`);
      setData(d);
    } catch {
      toast.error('Erro ao carregar tenant');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(newStatus) {
    const label = newStatus === 'suspended' ? 'Suspender' : newStatus === 'active' ? 'Reativar' : 'Cancelar';
    if (!confirm(`${label} este tenant?`)) return;
    try {
      await api.patch(`/superadmin/tenants/${id}/status`, { status: newStatus });
      toast.success('Status atualizado');
      fetchData();
    } catch {
      toast.error('Erro ao atualizar status');
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (resetPass.length < 8) { toast.error('Mínimo 8 caracteres'); return; }
    setResetting(true);
    try {
      await api.post(`/superadmin/tenants/${id}/reset-owner-password`, { newPassword: resetPass });
      toast.success('Senha do owner resetada!');
      setResetPass('');
    } catch {
      toast.error('Erro ao resetar senha');
    } finally {
      setResetting(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)', color: 'var(--muted)' }}>
      Carregando...
    </div>
  );

  if (!data) return null;

  const { tenant, users, channel, metrics } = data;
  const badge = STATUS_BADGE[tenant.status] || STATUS_BADGE.active;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'white' }}>
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/superadmin')} className="text-sm" style={{ color: 'var(--muted)' }}>← Clientes</button>
          <span className="text-lg font-bold">{tenant.name}</span>
          <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: badge.bg, color: badge.color }}>
            {badge.label}
          </span>
        </div>
        <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: '#7c3aed22', color: '#a78bfa' }}>
          Super Admin
        </span>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Conversas', value: metrics?.conversations_total ?? '–' },
            { label: 'Mensagens', value: metrics?.messages_total ?? '–' },
            { label: 'Conversas (30d)', value: metrics?.conversations_30d ?? '–' },
            { label: 'Msgs (30d)', value: metrics?.messages_30d ?? '–' },
          ].map(m => (
            <div key={m.label} className="rounded-2xl border p-4" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <div className="text-2xl font-bold text-white">{m.value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* Canal WhatsApp */}
        <div className="rounded-2xl border p-6" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Canal WhatsApp</h2>
            {channel && (
              <span className="text-xs px-2 py-1 rounded-full font-semibold"
                style={{ background: channel.status === 'active' ? '#16a34a22' : '#ca8a0422', color: channel.status === 'active' ? '#4ade80' : '#facc15' }}>
                {channel.status === 'active' ? 'Ativo' : channel.status}
              </span>
            )}
          </div>
          {channel ? (
            <div className="text-sm space-y-1" style={{ color: 'var(--muted)' }}>
              <div>Provider: <span className="text-white">{channel.provider}</span></div>
              <div>Phone ID: <span className="text-white">{channel.phone_id || '—'}</span></div>
              <div>Número: <span className="text-white">{channel.phone_number || '—'}</span></div>
            </div>
          ) : (
            <div className="text-sm" style={{ color: 'var(--muted)' }}>
              Nenhum canal configurado ainda.
            </div>
          )}
        </div>

        {/* Ativar Canal WhatsApp */}
        <div className="rounded-2xl border p-6" style={{ background: 'var(--bg2)', borderColor: '#7c3aed55' }}>
          <h2 className="font-semibold mb-1">{channel ? '🔄 Atualizar Canal WhatsApp' : '🚀 Ativar Canal WhatsApp'}</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
            Preencha os dados do Meta Business para ligar o canal deste tenant.
          </p>
          <form onSubmit={handleActivate} className="space-y-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Phone Number ID (Meta Business)</label>
              <input
                type="text"
                value={activateForm.phone_id}
                onChange={e => setActivateForm(f => ({ ...f, phone_id: e.target.value }))}
                placeholder={channel?.phone_id || 'ex: 123456789012345'}
                className="w-full px-4 py-3 rounded-xl text-sm text-white border outline-none focus:border-purple-500 transition"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Número WhatsApp</label>
              <input
                type="text"
                value={activateForm.phone_number}
                onChange={e => setActivateForm(f => ({ ...f, phone_number: e.target.value }))}
                placeholder={channel?.phone_number || 'ex: 5511999999999'}
                className="w-full px-4 py-3 rounded-xl text-sm text-white border outline-none focus:border-purple-500 transition"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Access Token (Meta — Token Permanente)</label>
              <input
                type="password"
                value={activateForm.whatsapp_token}
                onChange={e => setActivateForm(f => ({ ...f, whatsapp_token: e.target.value }))}
                placeholder="EAAxxxxxxxxxxxxxxxx..."
                className="w-full px-4 py-3 rounded-xl text-sm text-white border outline-none focus:border-purple-500 transition"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
              />
            </div>
            <button
              type="submit"
              disabled={activating}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
            >
              {activating ? 'Ativando...' : (channel ? 'Atualizar Canal' : 'Ativar Cliente')}
            </button>
          </form>
        </div>

        {/* Usuários */}
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <div className="px-6 py-4 font-semibold" style={{ background: 'var(--bg2)' }}>
            Usuários ({users.length})
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
                {['Nome', 'E-mail', 'Role', 'Status', 'Último acesso'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-medium" style={{ color: 'var(--muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none', background: 'var(--bg)' }}>
                  <td className="px-5 py-3 text-white">{u.name}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--muted)' }}>{u.email}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--muted)' }}>{ROLE_LABEL[u.role] || u.role}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs" style={{ color: u.status === 'active' ? '#4ade80' : '#f87171' }}>
                      {u.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-5 py-3" style={{ color: 'var(--muted)' }}>
                    {u.last_login ? new Date(u.last_login).toLocaleDateString('pt-BR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Ações */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Reset senha do owner */}
          <div className="rounded-2xl border p-6" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            <h2 className="font-semibold mb-4">Resetar senha do owner</h2>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <input
                type="text"
                value={resetPass}
                onChange={e => setResetPass(e.target.value)}
                placeholder="Nova senha (mín. 8 caracteres)"
                className="w-full px-4 py-3 rounded-xl text-sm text-white border outline-none focus:border-purple-500 transition"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
              />
              <button
                type="submit"
                disabled={resetting}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: '#7c3aed' }}
              >
                {resetting ? 'Resetando...' : 'Resetar senha'}
              </button>
            </form>
          </div>

          {/* Status do tenant */}
          <div className="rounded-2xl border p-6 space-y-3" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            <h2 className="font-semibold mb-4">Status do tenant</h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Criado em: {new Date(tenant.created_at).toLocaleDateString('pt-BR')}
            </p>
            {tenant.status === 'active' ? (
              <button
                onClick={() => handleStatusChange('suspended')}
                className="w-full py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: '#ca8a0422', color: '#facc15' }}
              >
                Suspender tenant
              </button>
            ) : tenant.status === 'suspended' ? (
              <button
                onClick={() => handleStatusChange('active')}
                className="w-full py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: '#16a34a22', color: '#4ade80' }}
              >
                Reativar tenant
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
