import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Check, X } from 'lucide-react';

function formatBRL(v) {
  return v != null ? `R$ ${parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';
}

const DEDUCTION_TYPE_LABEL = {
  battery: '🔋 Bateria',
  screen: '📱 Tela',
  back: '📷 Traseira',
  body: '⚙️ Carcaça',
  camera: '📸 Câmera',
  faceid: '👤 Face ID',
  other: '📦 Outro',
};

const EVAL_STATUS_COLOR = {
  pending: '#f59e0b',
  reviewing: '#2563eb',
  approved: '#059669',
  rejected: '#dc2626',
};

export default function TradesPage() {
  const [tab, setTab] = useState('rules');
  const [rules, setRules] = useState([]);
  const [deductions, setDeductions] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [showDeductionForm, setShowDeductionForm] = useState(false);
  const [ruleForm, setRuleForm] = useState({ model: '', storage: '', base_value: '' });
  const [deductionForm, setDeductionForm] = useState({ type: 'battery', condition: '', label: '', amount: '' });

  async function fetchAll() {
    const [r, d, e] = await Promise.all([
      api.get('/trades/rules').catch(() => ({ data: [] })),
      api.get('/trades/deductions').catch(() => ({ data: [] })),
      api.get('/trades/evaluations').catch(() => ({ data: [] })),
    ]);
    setRules(r.data);
    setDeductions(d.data);
    setEvaluations(e.data);
  }

  useEffect(() => { fetchAll(); }, []);

  async function saveRule(e) {
    e.preventDefault();
    if (!ruleForm.model || !ruleForm.base_value) return toast.error('Preencha modelo e valor base');
    try {
      await api.post('/trades/rules', { ...ruleForm, base_value: parseFloat(ruleForm.base_value) });
      toast.success('Regra salva');
      setShowRuleForm(false);
      setRuleForm({ model: '', storage: '', base_value: '' });
      fetchAll();
    } catch { toast.error('Erro ao salvar regra'); }
  }

  async function deleteRule(id) {
    if (!confirm('Remover esta regra?')) return;
    try { await api.delete(`/trades/rules/${id}`); fetchAll(); } catch { toast.error('Erro ao remover'); }
  }

  async function saveDeduction(e) {
    e.preventDefault();
    if (!deductionForm.condition || !deductionForm.label || !deductionForm.amount) return toast.error('Preencha todos os campos');
    try {
      await api.post('/trades/deductions', { ...deductionForm, amount: parseFloat(deductionForm.amount) });
      toast.success('Desconto salvo');
      setShowDeductionForm(false);
      setDeductionForm({ type: 'battery', condition: '', label: '', amount: '' });
      fetchAll();
    } catch { toast.error('Erro ao salvar desconto'); }
  }

  async function updateEval(id, status) {
    try {
      await api.patch(`/trades/evaluations/${id}`, { status });
      toast.success(status === 'approved' ? 'Aprovado!' : 'Rejeitado');
      fetchAll();
    } catch { toast.error('Erro ao atualizar avaliação'); }
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold text-white mb-6">Trocas</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
        {[['rules','Valores Base'], ['deductions','Descontos'], ['evaluations','Avaliações']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === key ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >{label}</button>
        ))}
      </div>

      {/* ── VALORES BASE ── */}
      {tab === 'rules' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Valor base de troca por modelo (antes dos descontos)</p>
            <button onClick={() => setShowRuleForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--primary)' }}>
              <Plus size={14} /> Adicionar
            </button>
          </div>

          {showRuleForm && (
            <form onSubmit={saveRule} className="mb-4 p-4 rounded-2xl border flex items-end gap-3 flex-wrap" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <div className="flex-1 min-w-40">
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Modelo</label>
                <input value={ruleForm.model} onChange={e => setRuleForm(p => ({ ...p, model: e.target.value }))} placeholder="Ex: iPhone 12" className="w-full px-3 py-2.5 rounded-xl text-sm text-white border outline-none" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }} />
              </div>
              <div className="w-32">
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Armazenamento</label>
                <input value={ruleForm.storage} onChange={e => setRuleForm(p => ({ ...p, storage: e.target.value }))} placeholder="64GB" className="w-full px-3 py-2.5 rounded-xl text-sm text-white border outline-none" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }} />
              </div>
              <div className="w-40">
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Valor base (R$)</label>
                <input type="number" step="0.01" value={ruleForm.base_value} onChange={e => setRuleForm(p => ({ ...p, base_value: e.target.value }))} placeholder="0,00" className="w-full px-3 py-2.5 rounded-xl text-sm text-white border outline-none" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }} />
              </div>
              <button type="submit" className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--primary)' }}>Salvar</button>
              <button type="button" onClick={() => setShowRuleForm(false)} className="px-4 py-2.5 rounded-xl text-sm border" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>Cancelar</button>
            </form>
          )}

          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-sm">
              <thead><tr className="border-b" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
                {['Modelo','Armazenamento','Valor base',''].map(h => <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: 'var(--muted)' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {rules.map(r => (
                  <tr key={r.id} className="border-b hover:bg-white/[0.02]" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3 text-white font-medium">{r.model}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{r.storage || 'Todos'}</td>
                    <td className="px-4 py-3 text-white">{formatBRL(r.base_value)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteRule(r.id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                {rules.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>Nenhuma regra cadastrada</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── DESCONTOS ── */}
      {tab === 'deductions' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Descontos aplicados conforme o estado do aparelho</p>
            <button onClick={() => setShowDeductionForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--primary)' }}>
              <Plus size={14} /> Adicionar
            </button>
          </div>

          {showDeductionForm && (
            <form onSubmit={saveDeduction} className="mb-4 p-4 rounded-2xl border flex items-end gap-3 flex-wrap" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <div className="w-36">
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Tipo</label>
                <select value={deductionForm.type} onChange={e => setDeductionForm(p => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl text-sm text-white border outline-none" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
                  {Object.entries(DEDUCTION_TYPE_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-32">
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Condição (chave)</label>
                <input value={deductionForm.condition} onChange={e => setDeductionForm(p => ({ ...p, condition: e.target.value }))} placeholder="Ex: below_80, cracked" className="w-full px-3 py-2.5 rounded-xl text-sm text-white border outline-none" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }} />
              </div>
              <div className="flex-1 min-w-40">
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Descrição (label)</label>
                <input value={deductionForm.label} onChange={e => setDeductionForm(p => ({ ...p, label: e.target.value }))} placeholder="Ex: Bateria abaixo de 80%" className="w-full px-3 py-2.5 rounded-xl text-sm text-white border outline-none" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }} />
              </div>
              <div className="w-36">
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Desconto (R$)</label>
                <input type="number" step="0.01" value={deductionForm.amount} onChange={e => setDeductionForm(p => ({ ...p, amount: e.target.value }))} placeholder="0,00" className="w-full px-3 py-2.5 rounded-xl text-sm text-white border outline-none" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }} />
              </div>
              <button type="submit" className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--primary)' }}>Salvar</button>
              <button type="button" onClick={() => setShowDeductionForm(false)} className="px-4 py-2.5 rounded-xl text-sm border" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>Cancelar</button>
            </form>
          )}

          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-sm">
              <thead><tr className="border-b" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
                {['Tipo','Condição','Descrição','Desconto','Ativo'].map(h => <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: 'var(--muted)' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {deductions.map(d => (
                  <tr key={d.id} className="border-b hover:bg-white/[0.02]" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3">{DEDUCTION_TYPE_LABEL[d.type] || d.type}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--muted)' }}>{d.condition}</td>
                    <td className="px-4 py-3 text-white">{d.label}</td>
                    <td className="px-4 py-3 text-red-400 font-medium">− {formatBRL(d.amount)}</td>
                    <td className="px-4 py-3">{d.active ? <span className="text-green-400">✓</span> : <span style={{ color: 'var(--muted)' }}>✗</span>}</td>
                  </tr>
                ))}
                {deductions.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>Nenhum desconto cadastrado</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── AVALIAÇÕES ── */}
      {tab === 'evaluations' && (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <thead><tr className="border-b" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              {['Cliente','Aparelho','Estimativa','Status','Ações'].map(h => <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: 'var(--muted)' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {evaluations.map(ev => {
                const color = EVAL_STATUS_COLOR[ev.status] || '#6b7280';
                return (
                  <tr key={ev.id} className="border-b hover:bg-white/[0.02]" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{ev.contact_name || ev.contact_phone}</div>
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>{ev.contact_phone}</div>
                    </td>
                    <td className="px-4 py-3 text-white">{ev.device_model} {ev.device_storage}</td>
                    <td className="px-4 py-3 text-white font-medium">{formatBRL(ev.estimate)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: color + '22', color }}>
                        {{ pending:'Pendente', reviewing:'Revisando', approved:'Aprovado', rejected:'Rejeitado' }[ev.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {ev.status === 'pending' || ev.status === 'reviewing' ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateEval(ev.id, 'approved')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-green-400 border border-green-400/30 hover:bg-green-400/10 transition">
                            <Check size={12} /> Aprovar
                          </button>
                          <button onClick={() => updateEval(ev.id, 'rejected')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-red-400 border border-red-400/30 hover:bg-red-400/10 transition">
                            <X size={12} /> Rejeitar
                          </button>
                        </div>
                      ) : <span className="text-xs" style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                  </tr>
                );
              })}
              {evaluations.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>Nenhuma avaliação</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

TradesPage.getLayout = (page) => <Layout>{page}</Layout>;
