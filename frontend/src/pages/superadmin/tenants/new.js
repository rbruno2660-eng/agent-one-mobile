import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import api from '../../../lib/api';
import toast from 'react-hot-toast';

export default function NewTenant() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    tenantName: '',
    niche: 'mobile_store',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
  });

  useEffect(() => {
    const user = (() => { try { return JSON.parse(localStorage.getItem('sa_user') || 'null'); } catch { return null; } })();
    if (!user?.isSuperAdmin) router.replace('/superadmin/login');
  }, []);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/superadmin/tenants', form);
      toast.success(`Cliente "${form.tenantName}" criado com sucesso!`);
      router.push(`/superadmin/tenants/${data.tenantId}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao criar cliente');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'white' }}>
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center gap-4" style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>
        <button onClick={() => router.back()} className="text-sm" style={{ color: 'var(--muted)' }}>← Voltar</button>
        <span className="text-lg font-bold">Novo Cliente</span>
        <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: '#7c3aed22', color: '#a78bfa' }}>
          Super Admin
        </span>
      </div>

      <div className="max-w-xl mx-auto px-6 py-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tenant */}
          <div className="rounded-2xl border p-6 space-y-4" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            <h2 className="font-semibold text-white">Dados da empresa</h2>

            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--muted)' }}>Nome da empresa</label>
              <input
                type="text"
                value={form.tenantName}
                onChange={e => set('tenantName', e.target.value)}
                required
                placeholder="MeuCelular"
                className="w-full px-4 py-3 rounded-xl text-sm text-white border outline-none focus:border-purple-500 transition"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
              />
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--muted)' }}>Nicho</label>
              <select
                value={form.niche}
                onChange={e => set('niche', e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm text-white border outline-none focus:border-purple-500 transition"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
              >
                <option value="mobile_store">Loja de celulares</option>
                <option value="general">Geral</option>
              </select>
            </div>
          </div>

          {/* Owner */}
          <div className="rounded-2xl border p-6 space-y-4" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            <h2 className="font-semibold text-white">Acesso do owner</h2>

            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--muted)' }}>Nome completo</label>
              <input
                type="text"
                value={form.ownerName}
                onChange={e => set('ownerName', e.target.value)}
                required
                placeholder="João Silva"
                className="w-full px-4 py-3 rounded-xl text-sm text-white border outline-none focus:border-purple-500 transition"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
              />
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--muted)' }}>E-mail</label>
              <input
                type="email"
                value={form.ownerEmail}
                onChange={e => set('ownerEmail', e.target.value)}
                required
                placeholder="financeiro@meucelular.com"
                className="w-full px-4 py-3 rounded-xl text-sm text-white border outline-none focus:border-purple-500 transition"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
              />
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--muted)' }}>Senha inicial</label>
              <input
                type="text"
                value={form.ownerPassword}
                onChange={e => set('ownerPassword', e.target.value)}
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                className="w-full px-4 py-3 rounded-xl text-sm text-white border outline-none focus:border-purple-500 transition"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition disabled:opacity-50"
            style={{ background: '#7c3aed' }}
          >
            {loading ? 'Criando...' : 'Criar cliente'}
          </button>
        </form>
      </div>
    </div>
  );
}
