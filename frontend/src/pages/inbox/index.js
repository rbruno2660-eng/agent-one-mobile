import { useEffect, useState, useRef } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Send, Bot, User, RefreshCw, Trash2, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import clsx from 'clsx';

const STAGE_LABEL = {
  new: 'Novo', contacted: 'Contatado', qualifying: 'Qualificando',
  interested: 'Interessado', negotiating: 'Negociando', quoted: 'Proposta',
  won: 'Ganho', lost: 'Perdido',
};

function HandoffCard({ conversationId }) {
  const [summary, setSummary] = useState(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setSummary(null);
    api.get(`/conversations/${conversationId}/handoff-summary`)
      .then(r => setSummary(r.data))
      .catch(() => {});
  }, [conversationId]);

  if (!summary) return null;

  const { lead, handoff, recommended_action } = summary;
  const temp = lead?.temperature;

  return (
    <div className="mx-6 mt-4 rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>
      {/* Header do card */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition"
      >
        <div className="flex items-center gap-2">
          <Zap size={14} color="#f59e0b" />
          <span className="text-xs font-semibold text-white">Briefing do Vendedor</span>
          {lead && (
            <span className="text-xs px-2 py-0.5 rounded-md font-medium" style={{
              background: temp?.color ? temp.color + '22' : 'var(--bg)',
              color: temp?.color || 'var(--muted)',
            }}>
              {temp?.emoji} {temp?.label} · {lead.score}pts
            </span>
          )}
        </div>
        {open ? <ChevronUp size={14} style={{ color: 'var(--muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--muted)' }} />}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--border)' }}>
          {/* Grid de info */}
          <div className="grid grid-cols-2 gap-3 mt-3 lg:grid-cols-4">
            {lead?.product && (
              <div className="rounded-xl p-3 border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Produto de interesse</div>
                <div className="text-sm font-medium text-white">{lead.product.model} {lead.product.storage || ''}</div>
                {lead.product.price && (
                  <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                    R$ {Number(lead.product.price).toLocaleString('pt-BR')}
                  </div>
                )}
              </div>
            )}
            {lead?.stage && (
              <div className="rounded-xl p-3 border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Etapa do funil</div>
                <div className="text-sm font-medium text-white">{STAGE_LABEL[lead.stage] || lead.stage}</div>
                {lead.follow_up_count > 0 && (
                  <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{lead.follow_up_count} follow-up(s)</div>
                )}
              </div>
            )}
            {lead?.value > 0 && (
              <div className="rounded-xl p-3 border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Orçamento</div>
                <div className="text-sm font-medium" style={{ color: '#4ade80' }}>
                  R$ {Number(lead.value).toLocaleString('pt-BR')}
                </div>
              </div>
            )}
            {handoff?.reason && (
              <div className="rounded-xl p-3 border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Motivo do handoff</div>
                <div className="text-sm font-medium text-white truncate">{handoff.reason}</div>
              </div>
            )}
          </div>

          {/* Resumo da IA */}
          {handoff?.summary && (
            <div className="mt-3 rounded-xl p-3 border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Resumo da IA</div>
              <p className="text-sm text-white">{handoff.summary}</p>
            </div>
          )}

          {/* Ação recomendada */}
          {recommended_action && (
            <div className="mt-3 rounded-xl p-3 border" style={{ borderColor: '#f59e0b44', background: 'rgba(245,158,11,0.06)' }}>
              <div className="text-xs mb-1" style={{ color: '#f59e0b' }}>⚡ Ação recomendada</div>
              <p className="text-sm font-medium text-white">{recommended_action}</p>
            </div>
          )}

          {/* Notas do vendedor */}
          {lead?.notes && (
            <div className="mt-3 rounded-xl p-3 border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Notas</div>
              <p className="text-sm text-white">{lead.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const STATUS_LABEL = {
  new: 'Nova',
  ai_active: 'IA ativa',
  qualifying: 'Qualificando',
  offering: 'Ofertando',
  trade_evaluation: 'Troca',
  payment_pending: 'Pagamento',
  human_requested: 'Solicitou humano',
  human_active: 'Humano',
  follow_up: 'Follow-up',
  closed: 'Encerrada',
};

const STATUS_COLOR = {
  new: '#6b7280',
  ai_active: '#2563eb',
  human_requested: '#f59e0b',
  human_active: '#059669',
  follow_up: '#7c3aed',
  closed: '#374151',
};

function Badge({ status }) {
  const color = STATUS_COLOR[status] || '#6b7280';
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: color + '22', color }}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

export default function InboxPage() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState('');
  const bottomRef = useRef(null);

  async function fetchConversations() {
    try {
      const params = {};
      if (filter) params.status = filter;
      const { data } = await api.get('/conversations', { params });
      setConversations(data);
    } catch {
      toast.error('Erro ao carregar conversas');
    }
  }

  async function loadConversation(conv) {
    setSelected(conv);
    try {
      const { data } = await api.get(`/conversations/${conv.id}`);
      setMessages(data.messages || []);
      setSelected(data);
    } catch {
      toast.error('Erro ao carregar conversa');
    }
  }

  useEffect(() => { fetchConversations(); }, [filter]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendReply(e) {
    e.preventDefault();
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      await api.post(`/conversations/${selected.id}/reply`, { text: reply });
      setReply('');
      await loadConversation(selected);
      toast.success('Mensagem enviada');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  }

  async function handleHandoff() {
    if (!selected) return;
    try {
      await api.post(`/conversations/${selected.id}/handoff`, { reason: 'Atendimento manual solicitado' });
      await api.patch(`/conversations/${selected.id}/assign`, { user_id: null });
      toast.success('Conversa assumida');
      await loadConversation(selected);
      fetchConversations();
    } catch {
      toast.error('Erro ao assumir conversa');
    }
  }

  async function returnToAI() {
    if (!selected) return;
    try {
      await api.patch(`/conversations/${selected.id}/return-to-ai`);
      toast.success('Devolvido para IA');
      await loadConversation(selected);
      fetchConversations();
    } catch {
      toast.error('Erro ao devolver para IA');
    }
  }

  async function deleteConversation(conv, e) {
    e.stopPropagation();
    if (!confirm(`Excluir conversa com ${conv.contact_name || conv.contact_phone}? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/conversations/${conv.id}`);
      toast.success('Conversa excluída');
      if (selected?.id === conv.id) { setSelected(null); setMessages([]); }
      fetchConversations();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao excluir conversa');
    }
  }

  async function closeConversation() {
    if (!selected) return;
    try {
      await api.patch(`/conversations/${selected.id}/close`);
      toast.success('Conversa encerrada');
      setSelected(null);
      setMessages([]);
      fetchConversations();
    } catch {
      toast.error('Erro ao encerrar');
    }
  }

  return (
    <div className="flex h-full">
      {/* Lista de conversas */}
      <div className="w-72 flex-shrink-0 border-r flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>
        <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h1 className="text-sm font-bold text-white mb-3">Inbox</h1>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs text-white border outline-none"
            style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
          >
            <option value="">Todas</option>
            <option value="new">Novas</option>
            <option value="ai_active">IA ativa</option>
            <option value="human_requested">Solicitou humano</option>
            <option value="human_active">Humano ativo</option>
            <option value="closed">Encerradas</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="text-center py-10 text-xs" style={{ color: 'var(--muted)' }}>Nenhuma conversa</div>
          ) : conversations.map(conv => (
            <div
              key={conv.id}
              className={clsx(
                'group relative w-full text-left px-4 py-3 border-b transition cursor-pointer',
                selected?.id === conv.id ? 'bg-blue-600/10 border-blue-600/30' : 'hover:bg-white/5'
              )}
              style={{ borderColor: 'var(--border)' }}
              onClick={() => loadConversation(conv)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white truncate pr-2">{conv.contact_name || conv.contact_phone}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Badge status={conv.status} />
                  <button
                    onClick={(e) => deleteConversation(conv, e)}
                    className="opacity-0 group-hover:opacity-100 transition p-1 rounded hover:text-red-400"
                    style={{ color: 'var(--muted)' }}
                    title="Excluir conversa"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <div className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                {conv.last_message || 'Sem mensagens'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Selecione uma conversa</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header da conversa */}
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>
              <div>
                <div className="font-semibold text-white">{selected.contact_name || selected.contact_phone}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{selected.contact_phone}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge status={selected.status} />
                {selected.status !== 'human_active' && selected.status !== 'closed' && (
                  <button onClick={handleHandoff} className="text-xs px-3 py-1.5 rounded-lg border transition hover:bg-white/5" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                    Assumir
                  </button>
                )}
                {selected.status === 'human_active' && (
                  <button onClick={returnToAI} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition hover:bg-white/5" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                    <RefreshCw size={12} /> Devolver à IA
                  </button>
                )}
                {selected.status !== 'closed' && (
                  <button onClick={closeConversation} className="text-xs px-3 py-1.5 rounded-lg border transition hover:bg-red-400/10 hover:border-red-400/30 hover:text-red-400" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                    Encerrar
                  </button>
                )}
              </div>
            </div>

            {/* Briefing card — visível quando humano assumiu ou está na fila */}
            {(selected.status === 'human_active' || selected.status === 'human_requested') && (
              <HandoffCard conversationId={selected.id} />
            )}

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={clsx('flex', msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                  <div className={clsx('max-w-xs lg:max-w-md')}>
                    <div
                      className={clsx('px-4 py-2.5 rounded-2xl text-sm', msg.direction === 'outbound' ? 'text-white' : 'text-white')}
                      style={{ background: msg.direction === 'outbound' ? 'var(--primary)' : 'var(--bg2)', border: msg.direction === 'inbound' ? `1px solid var(--border)` : 'none' }}
                    >
                      {msg.content}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 px-1" style={{ color: 'var(--muted)' }}>
                      {msg.direction === 'outbound' ? <Bot size={10} /> : <User size={10} />}
                      <span className="text-xs">{new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      {msg.metadata?.source === 'follow_up' && (
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: '#7c3aed22', color: '#a78bfa' }}>
                          Auto
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Campo de resposta */}
            {selected.status !== 'closed' && (
              <form onSubmit={sendReply} className="px-6 py-4 border-t flex items-center gap-3" style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>
                <input
                  type="text"
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 px-4 py-3 rounded-xl text-sm text-white border outline-none focus:border-blue-500 transition"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
                />
                <button
                  type="submit"
                  disabled={sending || !reply.trim()}
                  className="w-11 h-11 rounded-xl flex items-center justify-center transition disabled:opacity-40"
                  style={{ background: 'var(--primary)' }}
                >
                  <Send size={16} className="text-white" />
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

InboxPage.getLayout = (page) => <Layout>{page}</Layout>;
