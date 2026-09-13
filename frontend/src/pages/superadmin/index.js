import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  active:    { label: 'Ativo',      bg: '#16a34a22', color: '#4ade80' },
  suspended: { label: 'Suspenso',   bg: '#ca8a0422', color: '#facc15' },
  cancelled: { label: 'Cancelado',  bg: '#dc262622', color: '#f87171' },
};

export default function SuperAdminIndex() {
  const router = useRouter();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se é superadmin
    const user = (() => { try { return JSON.parse(localStorage.getItem('sa_user') || 'null'); } catch { return null; } })();
    if (!user?.isSuperAdmin) { router.replace('/superadmin/login'); return; }
    fetchTenants();
  }, []);

  async function fetchTenants() {
    try {
      const { data } = await api.get('/superadmin/tenants');
      setTenants(data);
    } catch {
      toast.error('Erro ao carregar tenants');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(tenantId, newStatus, tenantName) {
    if (!confirm(`${newStatus === 'suspended' ? 'Suspender' : 'Reativar'} o tenant "${tenantName}"?`)) return;
    try {
      await api.patch(`/superadmin/tenants/${tenantId}/status`, { status: newStatus });
      toast.success('Status atualizado');
      fetchTenants();
    } catch {
      toast.error('Erro ao atualizar status');
    }
  }

  function handleLogout() {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    localStorage.removeItem('sa_user');
    router.replace('/superadmin/login');
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'white' }}>
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-white">Agent One</span>
          <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: '#7c3aed22', color: '#a78bfa' }}>
            Super Admin
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/superadmin/tenants/new')}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--primary)' }}
          >
            + Novo Cliente
          </button>
          <button onClick={handleLogout} className="text-sm" style={{ color: 'var(--muted)' }}>
            Sair
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-2">Clientes</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
          {tenants.length} tenant{tenants.length !== 1 ? 's' : ''} cadastrado{tenants.length !== 1 ? 's' : ''}
        </p>

        {loading ? (
          <div className="text-center py-20" style={{ color: 'var(--muted)' }}>Carregando...</div>
        ) : (
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left px-5 py-3 font-medium" style={{ color: 'var(--muted)' }}>Nome</th>
                  <th className="text-left px-5 py-3 font-medium" style={{ color: 'var(--muted)' }}>Nicho</th>
                  <th className="text-left px-5 py-3 font-medium" style={{ color: 'var(--muted)' }}>Status</th>
                  <th className="text-left px-5 py-3 font-medium" style={{ color: 'var(--muted)' }}>Usuários</th>
                  <th className="text-left px-5 py-3 font-medium" style={{ color: 'var(--muted)' }}>Conversas</th>
                  <th className="text-left px-5 py-3 font-medium" style={{ color: 'var(--muted)' }}>Criado em</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {tenants.map((t, i) => {
                  const badge = STATUS_BADGE[t.status] || STATUS_BADGE.active;
                  return (
                    <tr
                      key={t.id}
                      style={{ borderBottom: i < tenants.length - 1 ? '1px solid var(--border)' : 'none', background: 'var(--bg)' }}
                    >
                      <td className="px-5 py-4 font-semibold text-white">
                        <button
                          onClick={() => router.push(`/superadmin/tenants/${t.id}`)}
                          className="hover:underline text-left"
                        >
                          {t.name}
                        </button>
                      </td>
                      <td className="px-5 py-4" style={{ color: 'var(--muted)' }}>{t.niche}</td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{ background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-4" style={{ color: 'var(--muted)' }}>{t.user_count}</td>
                      <td className="px-5 py-4" style={{ color: 'var(--muted)' }}>{t.conversation_count}</td>
                      <td className="px-5 py-4" style={{ color: 'var(--muted)' }}>
                        {new Date(t.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => router.push(`/superadmin/tenants/${t.id}`)}
                            className="text-xs px-3 py-1.5 rounded-lg"
                            style={{ background: 'var(--bg2)', color: 'white' }}
                          >
                            Detalhes
                          </button>
                          {t.status === 'active' ? (
                            <button
                              onClick={() => handleStatusChange(t.id, 'suspended', t.name)}
                              className="text-xs px-3 py-1.5 rounded-lg"
                              style={{ background: '#ca8a0422', color: '#facc15' }}
                            >
                              Suspender
                            </button>
                          ) : t.status === 'suspended' ? (
                            <button
                              onClick={() => handleStatusChange(t.id, 'active', t.name)}
                              className="text-xs px-3 py-1.5 rounded-lg"
                              style={{ background: '#16a34a22', color: '#4ade80' }}
                            >
                              Reativar
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {tenants.length === 0 && (
              <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
                Nenhum tenant cadastrado ainda.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
