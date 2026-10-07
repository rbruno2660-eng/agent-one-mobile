/**
 * Relatório de Performance — /report?period=30
 * Página otimizada para impressão (Ctrl+P → Salvar como PDF).
 * Sem Layout/sidebar — abre em nova aba.
 */
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import api from '../lib/api';

const STAGE_PT = {
  new: 'Novo', contacted: 'Contatado', qualifying: 'Qualificando',
  interested: 'Interessado', negotiating: 'Negociando',
  quoted: 'Proposta enviada', won: 'Ganho', lost: 'Perdido',
};

function fmt(n) {
  if (!n && n !== 0) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function fmtNum(n) {
  return (n || 0).toLocaleString('pt-BR');
}

export default function ReportPage() {
  const router = useRouter();
  const { period = '30' } = router.query;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!router.isReady) return;
    api.get(`/analytics/report?period=${period}`)
      .then(r => setData(r.data))
      .catch(() => setError('Erro ao carregar relatório'))
      .finally(() => setLoading(false));
  }, [router.isReady, period]);

  useEffect(() => {
    if (data) {
      // Auto-print após carregar os dados
      setTimeout(() => window.print(), 800);
    }
  }, [data]);

  const genDate = data?.generated_at
    ? new Date(data.generated_at).toLocaleString('pt-BR')
    : '';

  if (loading) {
    return (
      <div style={{ fontFamily: 'system-ui', textAlign: 'center', padding: 60, color: '#6b7280' }}>
        Carregando relatório...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ fontFamily: 'system-ui', textAlign: 'center', padding: 60, color: '#ef4444' }}>
        {error || 'Dados indisponíveis'}
      </div>
    );
  }

  const { tenant, conversations, comercial, ia, leads_by_stage, top_products } = data;

  return (
    <>
      <Head>
        <title>Relatório — {tenant.name}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          @media print {
            .no-print { display: none !important; }
            body { margin: 0; }
            .page-break { page-break-before: always; }
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', system-ui, sans-serif; background: #fff; color: #111; }
        `}</style>
      </Head>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>

        {/* Botão de impressão — some no print */}
        <div className="no-print" style={{ textAlign: 'right', marginBottom: 16 }}>
          <button
            onClick={() => window.print()}
            style={{
              background: '#2563eb', color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 20px', fontSize: 13,
              cursor: 'pointer', fontWeight: 600,
            }}
          >
            🖨️ Imprimir / Salvar PDF
          </button>
        </div>

        {/* Cabeçalho */}
        <div style={{ borderBottom: '2px solid #1e3a5f', paddingBottom: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1e3a5f' }}>{tenant.name}</div>
              <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                Relatório de Performance — últimos {data.period} dias
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, color: '#9ca3af' }}>
              <div>Gerado em</div>
              <div>{genDate}</div>
            </div>
          </div>
        </div>

        {/* Seção 1 — Conversas */}
        <Section title="Conversas">
          <Grid4>
            <Metric label="Total" value={fmtNum(conversations.total)} />
            <Metric label="Encerradas" value={fmtNum(conversations.closed)} />
            <Metric label="Em atendimento humano" value={fmtNum(conversations.in_handoff)} />
            <Metric label="Com IA" value={fmtNum(conversations.ai_active)} />
          </Grid4>
        </Section>

        {/* Seção 2 — Comercial */}
        <Section title="Comercial">
          <Grid4>
            <Metric label="Receita realizada" value={fmt(comercial.receita)} color="#16a34a" />
            <Metric label="Ticket médio" value={fmt(comercial.ticket_medio)} color="#2563eb" />
            <Metric label="Taxa de conversão" value={`${comercial.conversion_rate}%`} color="#7c3aed" />
            <Metric label="Pipeline em aberto" value={fmt(comercial.pipeline)} color="#d97706" />
          </Grid4>
          <div style={{ marginTop: 16, display: 'flex', gap: 24 }}>
            <Metric label="Leads ganhos" value={fmtNum(comercial.won)} color="#16a34a" inline />
            <Metric label="Leads perdidos" value={fmtNum(comercial.lost)} color="#ef4444" inline />
            <Metric label="Leads ativos" value={fmtNum(comercial.active)} inline />
            <Metric label="Total de leads" value={fmtNum(comercial.total_leads)} inline />
          </div>
        </Section>

        {/* Seção 3 — Leads por estágio */}
        {leads_by_stage.length > 0 && (
          <Section title="Leads por estágio">
            <Table
              headers={['Estágio', 'Leads', 'Valor em carteira']}
              rows={leads_by_stage.map(r => [
                STAGE_PT[r.stage] || r.stage,
                fmtNum(r.total),
                r.total_value > 0 ? fmt(r.total_value) : '—',
              ])}
            />
          </Section>
        )}

        {/* Seção 4 — Top produtos */}
        {top_products.length > 0 && (
          <Section title="Top produtos mais consultados">
            <Table
              headers={['Produto', 'Leads gerados']}
              rows={top_products.map(r => [
                `${r.model}${r.storage ? ' ' + r.storage : ''}`,
                fmtNum(r.leads_count),
              ])}
            />
          </Section>
        )}

        {/* Seção 5 — IA */}
        <Section title="Performance da IA">
          <Grid4>
            <Metric label="Chamadas ao Claude" value={fmtNum(ia.total_calls)} />
            <Metric label="Conversas atendidas" value={fmtNum(ia.conversations_served)} />
            <Metric label="Custo total (USD)" value={`$${(ia.total_cost_usd || 0).toFixed(4)}`} />
            <Metric label="Latência média" value={`${ia.avg_latency_ms || 0}ms`} />
          </Grid4>
          <div style={{ marginTop: 12, fontSize: 11, color: '#9ca3af' }}>
            {fmtNum(ia.total_tokens)} tokens consumidos no período ·{' '}
            Custo por conversa: ${ia.conversations_served > 0
              ? (ia.total_cost_usd / ia.conversations_served).toFixed(4)
              : '0.0000'}
          </div>
        </Section>

        {/* Rodapé */}
        <div style={{ marginTop: 40, borderTop: '1px solid #e5e7eb', paddingTop: 12, fontSize: 11, color: '#d1d5db', textAlign: 'center' }}>
          Gerado pelo Agent One · {genDate}
        </div>
      </div>
    </>
  );
}

// ── Componentes auxiliares ───────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontSize: 13, fontWeight: 700, color: '#1e3a5f',
        textTransform: 'uppercase', letterSpacing: '0.05em',
        borderBottom: '1px solid #e5e7eb', paddingBottom: 6, marginBottom: 14,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Grid4({ children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {children}
    </div>
  );
}

function Metric({ label, value, color, inline }) {
  if (inline) {
    return (
      <div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: color || '#111' }}>{value}</div>
      </div>
    );
  }
  return (
    <div style={{
      background: '#f9fafb', border: '1px solid #e5e7eb',
      borderRadius: 8, padding: '10px 14px',
    }}>
      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || '#111' }}>{value}</div>
    </div>
  );
}

function Table({ headers, rows }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ background: '#f3f4f6' }}>
          {headers.map((h, i) => (
            <th key={i} style={{
              padding: '8px 12px', textAlign: i === 0 ? 'left' : 'right',
              fontWeight: 600, fontSize: 12, color: '#6b7280',
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} style={{ borderBottom: '1px solid #f3f4f6' }}>
            {row.map((cell, ci) => (
              <td key={ci} style={{
                padding: '8px 12px', textAlign: ci === 0 ? 'left' : 'right', color: '#374151',
              }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
