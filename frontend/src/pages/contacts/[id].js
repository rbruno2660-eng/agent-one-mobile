/**
 * Timeline de conversas por contato — /contacts/[id]
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import { ArrowLeft, MessageSquare, User, Bot, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';

const STATUS_LABEL = {
  new: { label: 'Nova', color: '#9ca3af' },
  ai_active: { label: 'IA ativa', color: '#3b82f6' },
  human_requested: { label: 'Humano solicitado', color: '#f59e0b' },
  human_active: { label: 'Atendimento humano', color: '#8b5cf6' },
  closed: { label: 'Encerrada', color: '#6b7280' },
};

const STAGE_PT = {
  new: 'Novo', contacted: 'Contatado', qualifying: 'Qualificando',
  interested: 'Interessado', negotiating: 'Negociando',
  quoted: 'Proposta', won: 'Ganho', lost: 'Perdido',
};
const STAGE_COLOR = {
  won: '#22c55e', lost: '#ef4444', negotiating: '#f59e0b',
  interested: '#3b82f6', new: '#9ca3af',
};

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}
function fmtShort(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function ConversationBlock({ conv, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const st = STATUS_LABEL[conv.status] || { label: conv.status, color: '#6b7280' };

  return (
    <div className="rounded-2xl border mb-4 overflow-hidden"
      style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>

      {/* Header da conversa */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition text-left"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <MessageSquare size={15} style={{ color: 'var(--muted)' }} />
            <span className="text-sm font-medium text-white">
              {fmtDate(conv.created_at)}
            </span>
          </div>

          {/* Status */}
          <span className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: st.color + '22', color: st.color }}>
            {st.label}
          </span>

          {/* Lead info */}
          {conv.lead && (
            <div className="flex items-center gap-2">
              <TrendingUp size={13} style={{ color: 'var(--muted)' }} />
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                {conv.lead.product || 'Lead'}
              </span>
              {conv.lead.stage && (
                <span className="px-1.5 py-0.5 rounded text-xs"
                  style={{
                    background: (STAGE_COLOR[conv.lead.stage] || '#6b7280') + '22',
                    color: STAGE_COLOR[conv.lead.stage] || '#9ca3af',
                  }}>
                  {STAGE_PT[conv.lead.stage] || conv.lead.stage}
                </span>
              )}
              {conv.lead.score > 0 && (
                <span className="text-xs" style={{ color: '#f59e0b' }}>
                  Score {conv.lead.score}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            {conv.message_count} msg{conv.message_count !== 1 ? 's' : ''}
          </span>
          {open ? <ChevronUp size={15} style={{ color: 'var(--muted)' }} /> : <ChevronDown size={15} style={{ color: 'var(--muted)' }} />}
        </div>
      </button>

      {/* Mensagens */}
      {open && (
        <div className="border-t px-5 py-4 flex flex-col gap-2" style={{ borderColor: 'var(--border)' }}>
          {conv.messages.length === 0 ? (
            <div className="text-xs text-center py-4" style={{ color: 'var(--muted)' }}>
              Sem mensagens registradas
            </div>
          ) : (
            conv.messages.map(msg => {
              const isOut = msg.direction === 'outbound';
              return (
                <div key={msg.id}
                  className={`flex gap-2 ${isOut ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: isOut ? '#1d4ed822' : '#15803d22' }}>
                    {isOut
                      ? <Bot size={13} color="#3b82f6" />
                      : <User size={13} color="#22c55e" />}
                  </div>

                  {/* Balão */}
                  <div className={`max-w-xs md:max-w-sm lg:max-w-md rounded-2xl px-3 py-2 ${isOut ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                    style={{
                      background: isOut ? '#1e3a5f' : '#14532d22',
                      border: `1px solid ${isOut ? '#2563eb33' : '#16a34a33'}`,
                    }}>
                    <div className="text-sm text-white leading-relaxed whitespace-pre-wrap">
                      {msg.content || (msg.type === 'audio' ? '🎵 Áudio' : '[mídia]')}
                    </div>
                    <div className="text-xs mt-1 text-right" style={{ color: 'var(--muted)' }}>
                      {fmtShort(msg.created_at)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function ContactTimelinePage() {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.get(`/contacts/${id}/timeline`)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 text-center py-20 text-sm" style={{ color: 'var(--muted)' }}>
        Carregando timeline...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center py-20 text-sm" style={{ color: 'var(--muted)' }}>
        Contato não encontrado.
      </div>
    );
  }

  const { contact, conversations, total_conversations } = data;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Back */}
      <Link href="/contacts"
        className="flex items-center gap-2 text-sm mb-6 hover:text-white transition"
        style={{ color: 'var(--muted)' }}>
        <ArrowLeft size={14} /> Voltar para contatos
      </Link>

      {/* Header do contato */}
      <div className="rounded-2xl border p-5 mb-6"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white"
            style={{ background: 'var(--primary)' }}>
            {(contact.name || contact.phone)[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{contact.name || contact.phone}</h1>
            {contact.name && <div className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{contact.phone}</div>}
          </div>
          <div className="ml-auto text-right">
            <div className="text-2xl font-bold text-white">{total_conversations}</div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>
              conversa{total_conversations !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <h2 className="text-sm font-semibold text-white mb-4">
        Histórico de conversas
      </h2>

      {conversations.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--muted)' }}>
          Nenhuma conversa encontrada para este contato.
        </div>
      ) : (
        conversations.map((conv, i) => (
          <ConversationBlock key={conv.id} conv={conv} defaultOpen={i === 0} />
        ))
      )}
    </div>
  );
}

ContactTimelinePage.getLayout = (page) => <Layout>{page}</Layout>;
