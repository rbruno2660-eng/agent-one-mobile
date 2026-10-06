/**
 * Funil visual de conversas — Feature 3.
 * Kanban board com 5 estágios do ciclo de vendas.
 */

import { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/router';
import api from '../lib/api';
import { RefreshCw, Clock, Phone, Tag } from 'lucide-react';

const COLUMNS = [
  { key: 'interesse',   label: 'Interesse',   color: '#3b82f6' },
  { key: 'qualificado', label: 'Qualificado',  color: '#8b5cf6' },
  { key: 'negociacao',  label: 'Negociação',   color: '#f59e0b' },
  { key: 'fechamento',  label: 'Fechamento',   color: '#10b981' },
  { key: 'pos_venda',   label: 'Pós-venda',    color: '#6366f1' },
];

const URGENCY_COLORS = {
  green:  { bg: '#10b98122', border: '#10b981', text: '#10b981' },
  yellow: { bg: '#f59e0b22', border: '#f59e0b', text: '#f59e0b' },
  red:    { bg: '#ef444422', border: '#ef4444', text: '#ef4444' },
};

function formatTimeSince(seconds) {
  if (!seconds) return '—';
  if (seconds < 60)   return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function ConversationCard({ card }) {
  const urgencyStyle = URGENCY_COLORS[card.urgency] || URGENCY_COLORS.green;
  const router = useRouter();

  return (
    <div
      onClick={() => card.conversation_id && router.push(`/inbox?id=${card.conversation_id}`)}
      className="rounded-xl p-3 mb-2 cursor-pointer transition-all hover:opacity-90"
      style={{
        background: urgencyStyle.bg,
        border: `1px solid ${urgencyStyle.border}`,
      }}
    >
      {/* Cabeçalho: nome + tempo */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-white truncate flex-1 mr-2">
          {card.contact_name || card.contact_phone}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0" style={{ color: urgencyStyle.text }}>
          <Clock size={10} />
          <span className="text-xs">{formatTimeSince(card.seconds_since_last)}</span>
        </div>
      </div>

      {/* Telefone */}
      <div className="flex items-center gap-1 mb-1" style={{ color: 'var(--muted)' }}>
        <Phone size={10} />
        <span className="text-xs">{card.contact_phone}</span>
      </div>

      {/* Produto de interesse */}
      {card.product && (
        <div className="flex items-center gap-1 mb-1" style={{ color: 'var(--muted)' }}>
          <Tag size={10} />
          <span className="text-xs truncate">{card.product}</span>
        </div>
      )}

      {/* Preview da última mensagem */}
      {card.last_message_preview && (
        <p className="text-xs mt-1 truncate" style={{ color: 'var(--muted)' }}>
          {card.last_message_preview}
        </p>
      )}

      {/* Badge de status especial */}
      {card.conversation_status === 'reactivation_pending' && (
        <span className="mt-1 inline-block text-xs px-2 py-0.5 rounded-full bg-indigo-600/30 text-indigo-300">
          Reativação agendada
        </span>
      )}
      {card.conversation_status === 'human_requested' && (
        <span className="mt-1 inline-block text-xs px-2 py-0.5 rounded-full bg-orange-600/30 text-orange-300">
          Aguarda humano
        </span>
      )}
    </div>
  );
}

function KanbanColumn({ column, cards = [] }) {
  return (
    <div
      className="flex-1 min-w-0 flex flex-col rounded-2xl p-3"
      style={{ background: 'var(--bg2)', border: '1px solid var(--border)', minWidth: 200 }}
    >
      {/* Header da coluna */}
      <div className="flex items-center justify-between mb-3 pb-2" style={{ borderBottom: `2px solid ${column.color}` }}>
        <span className="text-sm font-bold text-white">{column.label}</span>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: column.color + '33', color: column.color }}
        >
          {cards.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
        {cards.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--muted)' }}>
            <p className="text-xs">Nenhuma conversa</p>
          </div>
        ) : (
          cards.map(card => (
            <ConversationCard key={card.conversation_id || card.reactivation_id} card={card} />
          ))
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [pipeline, setPipeline] = useState(null);
  const [totals, setTotals] = useState({});
  const [fetching, setFetching] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading]);

  const fetchPipeline = useCallback(async () => {
    setFetching(true);
    try {
      const { data } = await api.get('/pipeline');
      setPipeline(data.pipeline);
      setTotals(data.totals || {});
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Erro ao carregar funil:', err);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchPipeline();
  }, [user, fetchPipeline]);

  // Auto-refresh a cada 2 minutos
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchPipeline, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, fetchPipeline]);

  if (loading || !user) return null;

  const totalConvs = Object.values(totals).reduce((a, b) => a + b, 0);

  return (
    <Layout>
      <div className="p-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-white">Funil de Conversas</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
              {totalConvs} conversa{totalConvs !== 1 ? 's' : ''} ativas
              {lastUpdated && (
                <span> · Atualizado às {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              )}
            </p>
          </div>
          <button
            onClick={fetchPipeline}
            disabled={fetching}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            <RefreshCw size={14} className={fetching ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>

        {/* Legenda de urgência */}
        <div className="flex items-center gap-4 mb-4">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Urgência:</span>
          {[
            { label: '< 1h', color: '#10b981' },
            { label: '1–4h', color: '#f59e0b' },
            { label: '> 4h', color: '#ef4444' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
              <span className="text-xs" style={{ color: 'var(--muted)' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Kanban */}
        {!pipeline ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center" style={{ color: 'var(--muted)' }}>
              <RefreshCw size={32} className="mx-auto mb-3 opacity-40 animate-spin" />
              <p className="text-sm">Carregando funil...</p>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 flex-1 overflow-x-auto pb-2">
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.key}
                column={col}
                cards={pipeline[col.key] || []}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
