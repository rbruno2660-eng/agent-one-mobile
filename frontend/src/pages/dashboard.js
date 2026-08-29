import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/router';
import api from '../lib/api';
import { Package, MessageSquare, TrendingUp, AlertTriangle } from 'lucide-react';

function StatCard({ title, value, icon: Icon, color = '#2563eb' }) {
  return (
    <div className="rounded-2xl p-5 border" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm" style={{ color: 'var(--muted)' }}>{title}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + '22' }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{value ?? '—'}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading]);

  useEffect(() => {
    Promise.all([
      api.get('/products?active=true').catch(() => ({ data: [] })),
      api.get('/leads').catch(() => ({ data: [] })),
      api.get('/analytics/overview?period=1').catch(() => ({ data: null })),
      api.get('/analytics/overview?period=365').catch(() => ({ data: null })),
    ]).then(([products, leads, analyticsToday, analyticsAll]) => {
      const outOfStock = (products.data || []).filter(p => (p.available || 0) === 0).length;
      const today = analyticsToday.data;
      const all = analyticsAll.data;
      // Leads: soma todos os estágios do analytics anual (total, não só hoje)
      const leadsTotal = all?.leads
        ? Object.values(all.leads).reduce((a, b) => a + b, 0)
        : (leads.data || []).length;
      setStats({
        products: (products.data || []).length,
        leads: leadsTotal,
        out_of_stock: outOfStock,
        conversations_today: today?.conversations?.total ?? 0,
      });
    });
  }, []);

  if (loading || !user) return null;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Bom dia, {user.name.split(' ')[0]} 👋</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Aqui está o resumo da sua loja hoje.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
        <StatCard title="Produtos ativos" value={stats?.products} icon={Package} color="#2563eb" />
        <StatCard title="Conversas hoje" value={stats?.conversations_today} icon={MessageSquare} color="#7c3aed" />
        <StatCard title="Leads" value={stats?.leads} icon={TrendingUp} color="#059669" />
        <StatCard title="Sem estoque" value={stats?.out_of_stock} icon={AlertTriangle} color="#dc2626" />
      </div>

      {/* Atalhos */}
      <div className="rounded-2xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
        <h2 className="text-sm font-semibold text-white mb-4">Ações rápidas</h2>
        <div className="flex gap-3 flex-wrap">
          {[
            { label: '+ Produto', href: '/catalog/new' },
            { label: 'Ver Inbox', href: '/inbox' },
            { label: 'Ver Leads', href: '/leads' },
            { label: 'Regras de Troca', href: '/trades' },
          ].map(({ label, href }) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white border transition hover:bg-white/5"
              style={{ borderColor: 'var(--border)' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

DashboardPage.getLayout = (page) => <Layout>{page}</Layout>;
