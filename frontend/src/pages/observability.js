import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';
import { Activity, Zap, AlertCircle, Clock, MessageSquare, TrendingUp } from 'lucide-react';

function StatCard({ title, value, sub, icon: Icon, color = '#2563eb' }) {
  return (
    <div className="rounded-2xl p-5 border" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{title}</span>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + '22' }}>
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{value ?? '—'}</div>
      {sub && <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{sub}</div>}
    </div>
  );
}

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function ObservabilityPage() {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/analytics/ai-logs?period=${period}`)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const summary = data?.summary || {};
  const daily = data?.daily || [];
  const intents = data?.top_intents || [];

  // Máximos para escala dos gráficos
  const maxCalls = Math.max(...daily.map(d => d.calls), 1);
  const maxCost  = Math.max(...daily.map(d => d.cost_usd), 0.0001);

  const errorRate = summary.total_calls > 0
    ? ((summary.errors / summary.total_calls) * 100).toFixed(1)
    : '0.0';

  const totalIntents = intents.reduce((s, i) => s + i.total, 0);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Observabilidade de IA</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Custo, uso e performance do agente</p>
        </div>
        <select
          value={period}
          onChange={e => setPeriod(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm text-white border outline-none"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        >
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-20 text-sm" style={{ color: 'var(--muted)' }}>Carregando...</div>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 mb-6">
            <StatCard
              title="Chamadas de IA"
              value={summary.total_calls?.toLocaleString('pt-BR') || '0'}
              sub={`${summary.conversations_served || 0} conversas atendidas`}
              icon={Activity}
              color="#2563eb"
            />
            <StatCard
              title="Custo total (USD)"
              value={`$${(summary.total_cost_usd || 0).toFixed(4)}`}
              sub={`${((summary.total_tokens || 0) / 1000).toFixed(1)}k tokens`}
              icon={Zap}
              color="#f59e0b"
            />
            <StatCard
              title="Latência média"
              value={`${summary.avg_latency_ms || 0}ms`}
              sub="por chamada ao Claude"
              icon={Clock}
              color="#7c3aed"
            />
            <StatCard
              title="Taxa de erro"
              value={`${errorRate}%`}
              sub={`${summary.errors || 0} erros · ${summary.fallbacks || 0} fallbacks`}
              icon={AlertCircle}
              color={parseFloat(errorRate) > 5 ? '#ef4444' : '#22c55e'}
            />
            <StatCard
              title="Tokens por conversa"
              value={summary.conversations_served > 0
                ? Math.round((summary.total_tokens || 0) / summary.conversations_served).toLocaleString('pt-BR')
                : '—'}
              sub="média de tokens consumidos"
              icon={MessageSquare}
              color="#06b6d4"
            />
            <StatCard
              title="Custo por conversa"
              value={summary.conversations_served > 0
                ? `$${((summary.total_cost_usd || 0) / summary.conversations_served).toFixed(4)}`
                : '—'}
              sub="custo médio por atendimento"
              icon={TrendingUp}
              color="#34d399"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Gráfico de chamadas por dia */}
            <div className="rounded-2xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <h2 className="text-sm font-semibold text-white mb-4">Chamadas por dia</h2>
              {daily.length === 0 ? (
                <div className="py-8 text-center text-xs" style={{ color: 'var(--muted)' }}>Sem dados ainda</div>
              ) : (
                <div className="flex items-end gap-1 h-32">
                  {daily.map(d => {
                    const pct = maxCalls > 0 ? (d.calls / maxCalls) * 100 : 0;
                    const dateLabel = new Date(d.day).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    return (
                      <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div
                          className="w-full rounded-t-md transition-all"
                          style={{ height: `${Math.max(pct, 3)}%`, background: '#3b82f6', opacity: 0.8 }}
                        />
                        {/* Tooltip */}
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10">
                          <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap border" style={{ borderColor: 'var(--border)' }}>
                            {d.calls} calls · ${d.cost_usd.toFixed(4)}
                          </div>
                        </div>
                        <span className="text-xs" style={{ color: 'var(--muted)', fontSize: '9px' }}>{dateLabel}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top intents */}
            <div className="rounded-2xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <h2 className="text-sm font-semibold text-white mb-4">Top intenções detectadas</h2>
              {intents.length === 0 ? (
                <div className="py-8 text-center text-xs" style={{ color: 'var(--muted)' }}>Sem dados ainda — os intents aparecem conforme o agente atende clientes</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {intents.map((item, i) => {
                    const pct = totalIntents > 0 ? Math.round((item.total / totalIntents) * 100) : 0;
                    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#6b7280'];
                    const color = colors[i % colors.length];
                    return (
                      <div key={item.intent} className="flex items-center gap-3">
                        <div className="w-24 text-xs truncate flex-shrink-0" style={{ color: 'var(--muted)' }}>
                          {item.intent}
                        </div>
                        <MiniBar value={item.total} max={intents[0].total} color={color} />
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-xs font-medium text-white">{item.total}</span>
                          <span className="text-xs" style={{ color: 'var(--muted)' }}>{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Custo acumulado por dia */}
            <div className="rounded-2xl border p-5 lg:col-span-2" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <h2 className="text-sm font-semibold text-white mb-4">Custo diário (USD)</h2>
              {daily.length === 0 ? (
                <div className="py-6 text-center text-xs" style={{ color: 'var(--muted)' }}>Sem dados</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ color: 'var(--muted)' }}>
                        <th className="text-left py-2 pr-4">Data</th>
                        <th className="text-right py-2 px-4">Chamadas</th>
                        <th className="text-right py-2 px-4">Tokens</th>
                        <th className="text-right py-2 pl-4">Custo (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...daily].reverse().map(d => (
                        <tr key={d.day} className="border-t" style={{ borderColor: 'var(--border)' }}>
                          <td className="py-2 pr-4 text-white">
                            {new Date(d.day).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </td>
                          <td className="py-2 px-4 text-right text-white">{d.calls.toLocaleString('pt-BR')}</td>
                          <td className="py-2 px-4 text-right" style={{ color: 'var(--muted)' }}>
                            {(d.tokens / 1000).toFixed(1)}k
                          </td>
                          <td className="py-2 pl-4 text-right font-medium" style={{ color: '#f59e0b' }}>
                            ${d.cost_usd.toFixed(4)}
                          </td>
                        </tr>
                      ))}
                      {/* Totais */}
                      <tr className="border-t font-semibold" style={{ borderColor: 'var(--border)' }}>
                        <td className="py-2 pr-4 text-white">Total</td>
                        <td className="py-2 px-4 text-right text-white">
                          {daily.reduce((s, d) => s + d.calls, 0).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-2 px-4 text-right" style={{ color: 'var(--muted)' }}>
                          {(daily.reduce((s, d) => s + d.tokens, 0) / 1000).toFixed(1)}k
                        </td>
                        <td className="py-2 pl-4 text-right" style={{ color: '#f59e0b' }}>
                          ${daily.reduce((s, d) => s + d.cost_usd, 0).toFixed(4)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

ObservabilityPage.getLayout = (page) => <Layout>{page}</Layout>;
