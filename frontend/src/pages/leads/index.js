import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { ChevronDown } from 'lucide-react';

const STAGES = [
  { key: '', label: 'Todos' },
  { key: 'new', label: 'Novo' },
  { key: 'contacted', label: 'Contatado' },
  { key: 'interested', label: 'Interessado' },
  { key: 'quoted', label: 'Proposta enviada' },
  { key: 'won', label: 'Ganho' },
  { key: 'lost', label: 'Perdido' },
];

const STAGE_COLOR = {
  new: { bg: '#1e3a5f', text: '#60a5fa' },
  contacted: { bg: '#1c2d3a', text: '#38bdf8' },
  interested: { bg: '#1a2e22', text: '#4ade80' },
  quoted: { bg: '#2d2010', text: '#fb923c' },
  won: { bg: '#052e16', text: '#22c55e' },
  lost: { bg: '#2d1515', text: '#f87171' },
};

function ScoreBadge({ score }) {
  const s = score ?? 0;
  const color = s >= 80 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#6b7280';
  return (
    <div className="relative w-10 h-10 flex-shrink-0">
      <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
        <circle cx="18" cy="18" r="15" fill="none" stroke="#1f2937" strokeWidth="3" />
        <circle cx="18" cy="18" r="15" fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${(s / 100) * 94.2} 94.2`} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>{s}</span>
    </div>
  );
}

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [stage, setStage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editStage, setEditStage] = useState('');
  const [editNotes, setEditNotes] = useState('');

  async function fetchLeads() {
    const params = stage ? `?stage=${stage}` : '';
    const r = await api.get(`/leads${params}`).catch(() => ({ data: [] }));
    setLeads(r.data);
  }

  useEffect(() => { fetchLeads(); }, [stage]);

  function startEdit(lead) {
    setEditingId(lead.id);
    setEditStage(lead.stage || '');
    setEditNotes(lead.notes || '');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditStage('');
    setEditNotes('');
  }

  async function saveEdit(id) {
    try {
      await api.patch(`/leads/${id}`, { stage: editStage, notes: editNotes });
      toast.success('Lead atualizado');
      cancelEdit();
      fetchLeads();
    } catch { toast.error('Erro ao atualizar lead'); }
  }

  function timeSince(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'há poucos min';
    if (h < 24) return `há ${h}h`;
    const d = Math.floor(h / 24);
    return `há ${d}d`;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-white">Leads</h1>
        <div className="flex items-center gap-2">
          <select value={stage} onChange={e => setStage(e.target.value)} className="px-3 py-2 rounded-xl text-sm text-white border outline-none" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Kanban-style counts */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
        {STAGES.filter(s => s.key).map(s => {
          const count = leads.filter(l => l.stage === s.key).length;
          const col = STAGE_COLOR[s.key] || {};
          return (
            <button key={s.key} onClick={() => setStage(stage === s.key ? '' : s.key)}
              className="flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-medium border transition"
              style={{ background: stage === s.key ? col.bg : 'var(--bg2)', borderColor: stage === s.key ? col.text + '44' : 'var(--border)', color: col.text }}>
              {s.label} {count > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-md font-bold" style={{ background: col.bg }}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              {['Score', 'Contato', 'Produto de interesse', 'Etapa', 'Atualizado', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: 'var(--muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map(lead => {
              const col = STAGE_COLOR[lead.stage] || { bg: '#1f2937', text: '#6b7280' };
              const isEditing = editingId === lead.id;
              return (
                <tr key={lead.id} className="border-b hover:bg-white/[0.02] transition" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-4 py-3">
                    <ScoreBadge score={lead.score} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{lead.contact_name || lead.contact_phone}</div>
                    {lead.contact_name && <div className="text-xs" style={{ color: 'var(--muted)' }}>{lead.contact_phone}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {lead.product_model ? (
                      <span className="text-white">{lead.product_model} {lead.product_storage || ''}</span>
                    ) : <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <select value={editStage} onChange={e => setEditStage(e.target.value)}
                        className="px-2 py-1.5 rounded-lg text-xs border outline-none text-white"
                        style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
                        {STAGES.filter(s => s.key).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    ) : (
                      <span className="inline-flex px-2 py-1 rounded-md text-xs font-medium" style={{ background: col.bg, color: col.text }}>
                        {{ new:'Novo', contacted:'Contatado', interested:'Interessado', quoted:'Proposta', won:'Ganho', lost:'Perdido' }[lead.stage] || lead.stage}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>
                    {timeSince(lead.updated_at)}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Observação..." className="px-2 py-1.5 rounded-lg text-xs border outline-none text-white w-32" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }} />
                        <button onClick={() => saveEdit(lead.id)} className="px-2 py-1.5 rounded-lg text-xs text-green-400 border border-green-400/30 hover:bg-green-400/10">✓</button>
                        <button onClick={cancelEdit} className="px-2 py-1.5 rounded-lg text-xs border" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>✗</button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(lead)} className="px-3 py-1.5 rounded-lg text-xs border hover:border-blue-400/40 hover:text-white transition" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {leads.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--muted)' }}>Nenhum lead ainda — eles aparecem aqui conforme o agente qualificar clientes</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

LeadsPage.getLayout = (page) => <Layout>{page}</Layout>;
