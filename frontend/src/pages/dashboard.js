import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/router';
import api from '../lib/api';
import { Package, MessageSquare, TrendingUp, AlertTriangle, Zap, Megaphone, RotateCcw, DollarSign, Target, BarChart2 } from 'lucide-react';

function StatCard({ title, value, icon: Icon, color = '#2563eb', sub }) {
  return (
    <div className="rounded-2xl p-5 border" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm" style={{ color: 'var(--muted)' }}>{title}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + '22' }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{value ?? '—'}</div>
      {sub && <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{sub}</div>}
    </div>
  );
}

function fmt(n) {
  if (!n || n === 0) return 'R$ 0';
  if (n >= 1000) return `R$ ${(n / 1000).toFixed(1)}k`;
  return `R$ ${Math.round(n).toLocaleString('pt-BR')}`;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [comercial, setComercial] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading]);

  useEffect(() => {
    Promise.all([
      api.get('/products?active=true').catch(() => ({ data: [] })),
      api.get('/leads').catch(() => ({ data: [] })),
      api.get('/analytics/overview?period=1').catch(() => ({ data: null })),
      api.get('/analytics/overview?period=365').catch(() => ({ data: null })),
      api.get('/campaigns').catch(() => ({ data: [] })),
      api.get('/reactivation/pending').catch(() => ({ data: [] })),
      api.get('/analytics/comercial?period=30').catch(() => ({ data: null })),
    ]).then(([products, leads, analyticsToday, analyticsAll, campaigns, reactivation, comercialData]) => {
      const outOfStock = (products.data || []).filter(p => (p.available || 0) === 0).length;
      const today = analyticsToday.data;
      const all = analyticsAll.data;
      const leadsTotal = all?.leads
        ? Object.values(all.leads).reduce((a, b) => a + b, 0)
        : (leads.data || []).length;
      const followUps = (leads.data || []).reduce((sum, l) => sum + (l.follow_up_count || 0), 0);
      const activeCampaigns = (campaigns.data || []).filter(c => !['draft', 'cancelled'].includes(c.status)).length;
      const pendingReactivations = (reactivation.data || []).length;

      setStats({
        products: (products.data || []).length,
        leads: leadsTotal,
        out_of_stock: outOfStock,
        conversations_today: today?.conversations?.total ?? 0,
        follow_ups: followUps,
        active_campaigns: activeCampaigns,
        pending_reactivations: pendingReactivations,
      });

      if (comercialData.data) setComercial(comercialData.data);
    });
  }, []);

  if (loading || !user) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">{greeting}, {user.name.split(' ')[0]} 👋</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Aqui está o resumo da sua loja hoje.</p>
      </div>

      {/* Painel Comercial — receita dos últimos 30 dias */}
      {comercial && (
        <div className="rounded-2xl border p-5 mb-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Painel Comercial — últimos 30 dias</h2>
            <button onClick={() => router.push('/leads')} className="text-xs px-3 py-1.5 rounded-lg border hover:bg-white/5 transition" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
              Ver leads →
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-4">
            {/* Receita realizada */}
            <div className="rounded-xl p-4 border" style={{ borderColor: 'var(--border)', background: 'rgba(34,197,94,0.06)' }}>
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={14} color="#22c55e" />
                <span className="text-xs" style={{ color: 'var(--muted)' }}>Receita realizada</span>
              </div>
              <div className="text-xl font-bold" style={{ color: '#22c55e' }}>{fmt(comercial.receita_realizada)}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{comercial.leads?.won ?? 0} vendas fechadas</div>
            </div>

            {/* Ticket médio */}
            <div className="rounded-xl p-4 border" style={{ borderColor: 'var(--border)', background: 'rgba(59,130,246,0.06)' }}>
              <div className="flex items-center gap-2 mb-2">
                <BarChart2 size={14} color="#3b82f6" />
                <span className="text-xs" style={{ color: 'var(--muted)' }}>Ticket médio</span>
              </div>
              <div className="text-xl font-bold" style={{ color: '#3b82f6' }}>{fmt(comercial.ticket_medio)}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>por venda ganha</div>
            </div>

            {/* Taxa de conversão */}
            <div className="rounded-xl p-4 border" style={{ borderColor: 'var(--border)', background: 'rgba(168,85,247,0.06)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Target size={14} color="#a855f7" />
                <span className="text-xs" style={{ color: 'var(--muted)' }}>Taxa de conversão</span>
              </div>
              <div className="text-xl font-bold" style={{ color: '#a855f7' }}>{comercial.conversion_rate}%</div>
              <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{comercial.leads?.total ?? 0} leads totais</div>
            </div>

            {/* Pipeline total */}
            <div className="rounded-xl p-4 border" style={{ borderColor: 'var(--border)', background: 'rgba(245,158,11,0.06)' }}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} color="#f59e0b" />
                <span className="text-xs" style={{ color: 'var(--muted)' }}>Pipeline em aberto</span>
              </div>
              <div className="text-xl font-bold" style={{ color: '#f59e0b' }}>{fmt(comercial.pipeline_total)}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>oportunidades ativas</div>
            </div>
          </div>

          {/* Top leads quentes */}
          {comercial.hot_leads?.length > 0 && (
            <div>
              <div className="text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>🔥 Leads quentes agora</div>
              <div className="flex flex-col gap-2">
                {comercial.hot_leads.slice(0, 3).map(lead => (
                  <div key={lead.id} className="flex items-center justify-between rounded-xl px-3 py-2.5 border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                    <div className="flex items-center gap-3">
                      <div className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                        {lead.score}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-white">{lead.contact_name || lead.contact_phone}</div>
                        {lead.product_model && <div className="text-xs" style={{ color: 'var(--muted)' }}>{lead.product_model}</div>}
                      </div>
                    </div>
                    {lead.value > 0 && (
                      <span className="text-xs font-semibold" style={{ color: '#4ade80' }}>
                        {fmt(lead.value)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Linha 1 — métricas principais */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-4">
        <StatCard title="Produtos ativos"  value={stats?.products}            icon={Package}       color="#2563eb" />
        <StatCard title="Conversas hoje"   value={stats?.conversations_today} icon={MessageSquare} color="#7c3aed" />
        <StatCard title="Leads"            value={stats?.leads}               icon={TrendingUp}    color="#059669" />
        <StatCard title="Sem estoque"      value={stats?.out_of_stock}        icon={AlertTriangle} color="#dc2626" />
      </div>

      {/* Linha 2 — automações */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard title="Follow-ups enviados"    value={stats?.follow_ups}            icon={Zap}        color="#f59e0b" />
        <StatCard title="Campanhas ativas"       value={stats?.active_campaigns}      icon={Megaphone}  color="#ec4899" />
        <StatCard title="Reativações pendentes"  value={stats?.pending_reactivations} icon={RotateCcw}  color="#34d399" />
      </div>

      {/* Atalhos */}
      <div className="rounded-2xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
        <h2 className="text-sm font-semibold text-white mb-4">Ações rápidas</h2>
        <div className="flex gap-3 flex-wrap">
          {[
            { label: '+ Produto',    href: '/catalog/new' },
            { label: 'Ver Inbox',    href: '/inbox' },
            { label: 'Ver Leads',    href: '/leads' },
            { label: 'Ver Funil',    href: '/pipeline' },
            { label: 'Campanhas',    href: '/campaigns' },
            { label: 'Regras Troca', href: '/trades' },
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
