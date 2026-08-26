import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import { MessageSquare, Users, PhoneCall, TrendingUp, Bot, BarChart2 } from 'lucide-react';

const PERIODS = [
  { label: '7 dias', value: '7' },
  { label: '30 dias', value: '30' },
  { label: '90 dias', value: '90' },
];

const LEAD_STAGE_LABEL = {
  new: 'Novo', contacted: 'Contatado', interested: 'Interessado',
  quoted: 'Proposta', won: 'Ganho', lost: 'Perdido',
};

const LEAD_STAGE_COLOR = {
  new: '#3b82f6', contacted: '#06b6d4', interested: '#10b981',
  quoted: '#f59e0b', won: '#22c55e', lost: '#f87171',
};

function StatCard({ icon: Icon, label, value, sub, color = '#3b82f6' }) {
  return (
    <div className="rounded-2xl border p-5 flex items-start gap-4" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
      <div className="p-2.5 rounded-xl flex-shrink-0" style={{ background: color + '22' }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value ?? '—'}</div>
        <div className="text-sm font-medium text-white mt-0.5">{label}</div>
        {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{sub}</div>}
      </div>
    </div>
  );
}

function MiniBar({ day, total, maxVal }) {
  const pct = maxVal > 0 ? (total / maxVal) * 100 : 0;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-8 rounded-t-md" style={{ height: '60px', background: 'var(--bg)', display: 'flex', alignItems: 'flex-end' }}>
        <div className="w-full rounded-t-md bg-blue-500 transition-all" style={{ height: `${pct}%`, minHeight: pct > 0 ? '4px' : '0' }} />
      </div>
      <span className="text-xs" style={{ color: 'var(--muted)' }}>
        {new Date(day).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }).replace('/', '/')}
      </span>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/analytics/overview?period=${period}`)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period]);

  const maxDaily = data?.daily ? Math.max(...data.daily.map(d => d.total), 1) : 1;
  const leadEntries = data?.leads ? Object.entries(data.leads) : [];
  const leadTotal = leadEntries.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-white">Analytics</h1>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${period === p.value ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && data && (
        <div className="space-y-6">
          {/* Cards de métricas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={MessageSquare} label="Conversas" value={data.conversations.total} sub={`${data.conversations.closed} finalizadas`} color="#3b82f6" />
            <StatCard icon={Bot} label="Resolução IA" value={`${data.conversations.ai_resolution_rate}%`} sub={`${data.handoffs.total} handoffs`} color="#8b5cf6" />
            <StatCard icon={TrendingUp} label="Leads gerados" value={leadTotal} sub="no período" color="#10b981" />
            <StatCard icon={PhoneCall} label="Mensagens" value={data.messages.total} sub="trocadas no período" color="#f59e0b" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico de barras diário */}
            <div className="lg:col-span-2 rounded-2xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-semibold text-white mb-4">Conversas por dia (últimos 14 dias)</h3>
              {data.daily.length > 0 ? (
                <div className="flex items-end gap-2 overflow-x-auto pb-2">
                  {data.daily.map(d => <MiniBar key={d.day} day={d.day} total={d.total} maxVal={maxDaily} />)}
                </div>
              ) : (
                <div className="py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>Sem dados ainda</div>
              )}
            </div>

            {/* Funil de leads */}
            <div className="rounded-2xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-semibold text-white mb-4">Funil de Leads</h3>
              {leadEntries.length > 0 ? (
                <div className="space-y-2.5">
                  {leadEntries.sort((a, b) => b[1] - a[1]).map(([stage, count]) => {
                    const pct = leadTotal > 0 ? Math.round((count / leadTotal) * 100) : 0;
                    const color = LEAD_STAGE_COLOR[stage] || '#6b7280';
                    return (
                      <div key={stage}>
                        <div className="flex justify-between text-xs mb-1">
                          <span style={{ color: 'var(--muted)' }}>{LEAD_STAGE_LABEL[stage] || stage}</span>
                          <span className="text-white font-medium">{count}</span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ background: 'var(--bg)' }}>
                          <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>Sem leads no período</div>
              )}
            </div>
          </div>

          {/* Produtos mais consultados */}
          {data.top_products.length > 0 && (
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>
                <h3 className="text-sm font-semibold text-white">Produtos mais consultados pelo agente</h3>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="border-b" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
                  {['Modelo','Armazenamento','Consultas do agente'].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-medium" style={{ color: 'var(--muted)' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {data.top_products.map((p, i) => (
                    <tr key={i} className="border-b hover:bg-white/[0.02]" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-5 py-3 text-white font-medium">{p.model || 'Produto removido'}</td>
                      <td className="px-5 py-3" style={{ color: 'var(--muted)' }}>{p.storage || '—'}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-white font-bold">{p.queries}</span>
                          <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--bg)', maxWidth: '100px' }}>
                            <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${Math.min((p.queries / (data.top_products[0]?.queries || 1)) * 100, 100)}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!loading && !data && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BarChart2 size={40} className="mb-3" style={{ color: 'var(--muted)' }} />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Não foi possível carregar as métricas</p>
        </div>
      )}
    </div>
  );
}

AnalyticsPage.getLayout = (page) => <Layout>{page}</Layout>;
