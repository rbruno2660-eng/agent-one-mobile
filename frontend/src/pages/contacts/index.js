/**
 * Lista de Contatos — /contacts
 */
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import { Users, Search, MessageSquare, TrendingUp, ChevronRight } from 'lucide-react';

const STAGE_PT = {
  new: 'Novo', contacted: 'Contatado', qualifying: 'Qualificando',
  interested: 'Interessado', negotiating: 'Negociando',
  quoted: 'Proposta', won: 'Ganho', lost: 'Perdido',
};
const STAGE_COLOR = {
  won: '#22c55e', lost: '#ef4444', negotiating: '#f59e0b',
  interested: '#3b82f6', new: '#9ca3af',
};

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'Agora';
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d atrás`;
  return `${Math.floor(d / 30)}m atrás`;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback((s = '') => {
    setLoading(true);
    api.get(`/contacts?search=${encodeURIComponent(s)}&limit=100`)
      .then(r => { setContacts(r.data.contacts); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(search), 350);
    return () => clearTimeout(t);
  }, [search, load]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users size={20} /> Contatos
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {total} contato{total !== 1 ? 's' : ''} cadastrado{total !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Busca */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)', minWidth: 240 }}>
          <Search size={14} style={{ color: 'var(--muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou telefone…"
            className="bg-transparent outline-none text-sm text-white flex-1"
            style={{ caretColor: 'var(--primary)' }}
          />
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="text-center py-20 text-sm" style={{ color: 'var(--muted)' }}>Carregando...</div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-20 text-sm" style={{ color: 'var(--muted)' }}>
          Nenhum contato encontrado.
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
                <th className="text-left px-5 py-3 font-medium" style={{ color: 'var(--muted)' }}>Contato</th>
                <th className="text-center px-4 py-3 font-medium" style={{ color: 'var(--muted)' }}>Conversas</th>
                <th className="text-center px-4 py-3 font-medium" style={{ color: 'var(--muted)' }}>Leads</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--muted)' }}>Último estágio</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--muted)' }}>Última atividade</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => (
                <tr key={c.id}
                  className="border-t transition hover:bg-white/5"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <td className="px-5 py-3">
                    <div className="font-medium text-white">{c.name || c.phone}</div>
                    {c.name && <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{c.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1" style={{ color: 'var(--muted)' }}>
                      <MessageSquare size={13} />
                      <span className="text-white font-medium">{c.conversation_count}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1" style={{ color: 'var(--muted)' }}>
                      <TrendingUp size={13} />
                      <span className="text-white font-medium">{c.lead_count}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.last_stage ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          background: (STAGE_COLOR[c.last_stage] || '#6b7280') + '22',
                          color: STAGE_COLOR[c.last_stage] || '#9ca3af',
                        }}>
                        {STAGE_PT[c.last_stage] || c.last_stage}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--muted)' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs" style={{ color: 'var(--muted)' }}>
                    {timeAgo(c.last_activity)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/contacts/${c.id}`}
                      className="flex items-center justify-end gap-1 text-xs hover:text-white transition"
                      style={{ color: 'var(--muted)' }}
                    >
                      Ver timeline <ChevronRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

ContactsPage.getLayout = (page) => <Layout>{page}</Layout>;
