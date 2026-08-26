import { useEffect, useState, useCallback } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Check, X, Pencil, ChevronDown, ChevronRight } from 'lucide-react';

function formatBRL(v) {
  if (v == null || v === '' || isNaN(parseFloat(v))) return '—';
  return `R$ ${parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

const EVAL_STATUS_COLOR = {
  pending: '#f59e0b',
  reviewing: '#2563eb',
  approved: '#059669',
  rejected: '#dc2626',
};

export default function TradesPage() {
  const [tab, setTab] = useState('rules');
  const [rules, setRules] = useState([]);
  const [evaluations, setEvaluations] = useState([]);

  // Edit state for rules
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // New rule form
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [ruleForm, setRuleForm] = useState({ model: '', storage: '', min_value: '', max_value: '' });

  // Expanded deductions per model
  const [expandedModel, setExpandedModel] = useState(null);
  const [modelDeductions, setModelDeductions] = useState({});
  const [editingDedId, setEditingDedId] = useState(null);
  const [editDedAmount, setEditDedAmount] = useState('');

  // Search
  const [search, setSearch] = useState('');

  const fetchAll = useCallback(async () => {
    const [r, e] = await Promise.all([
      api.get('/trades/rules').catch(() => ({ data: [] })),
      api.get('/trades/evaluations').catch(() => ({ data: [] })),
    ]);
    setRules(r.data);
    setEvaluations(e.data);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function fetchDeductions(model) {
    if (modelDeductions[model]) return; // cached
    try {
      const res = await api.get(`/trades/device-deductions?model=${encodeURIComponent(model)}`);
      // filter exact match (ILIKE might return partial matches)
      const exact = res.data.filter(d => d.model.toLowerCase() === model.toLowerCase());
      setModelDeductions(prev => ({ ...prev, [model]: exact }));
    } catch {
      setModelDeductions(prev => ({ ...prev, [model]: [] }));
    }
  }

  function toggleExpand(model) {
    if (expandedModel === model) {
      setExpandedModel(null);
    } else {
      setExpandedModel(model);
      fetchDeductions(model);
    }
    setEditingDedId(null);
  }

  async function saveRule(e) {
    e.preventDefault();
    if (!ruleForm.model) return toast.error('Informe o modelo');
    try {
      await api.post('/trades/rules', {
        model: ruleForm.model,
        storage: ruleForm.storage || undefined,
        base_value: parseFloat(ruleForm.max_value || ruleForm.min_value || 0),
        min_value: ruleForm.min_value ? parseFloat(ruleForm.min_value) : undefined,
        max_value: ruleForm.max_value ? parseFloat(ruleForm.max_value) : undefined,
      });
      toast.success('Regra salva');
      setShowRuleForm(false);
      setRuleForm({ model: '', storage: '', min_value: '', max_value: '' });
      fetchAll();
    } catch { toast.error('Erro ao salvar regra'); }
  }

  function startEdit(rule) {
    setEditingId(rule.id);
    setEditForm({
      model: rule.model,
      storage: rule.storage || '',
      min_value: rule.min_value ?? '',
      max_value: rule.max_value ?? '',
    });
  }

  async function saveEdit(id) {
    try {
      await api.patch(`/trades/rules/${id}`, {
        min_value: editForm.min_value !== '' ? parseFloat(editForm.min_value) : null,
        max_value: editForm.max_value !== '' ? parseFloat(editForm.max_value) : null,
        base_value: editForm.max_value !== '' ? parseFloat(editForm.max_value) : (editForm.min_value !== '' ? parseFloat(editForm.min_value) : null),
      });
      toast.success('Atualizado');
      setEditingId(null);
      fetchAll();
    } catch { toast.error('Erro ao salvar'); }
  }

  async function deleteRule(id) {
    if (!confirm('Remover esta regra?')) return;
    try { await api.delete(`/trades/rules/${id}`); fetchAll(); } catch { toast.error('Erro ao remover'); }
  }

  async function saveDedEdit(ded) {
    try {
      await api.patch(`/trades/device-deductions/${ded.id}`, { amount: parseFloat(editDedAmount) });
      toast.success('Desconto atualizado');
      setEditingDedId(null);
      // refresh deductions for this model
      setModelDeductions(prev => ({
        ...prev,
        [ded.model]: prev[ded.model]?.map(d => d.id === ded.id ? { ...d, amount: editDedAmount } : d) || [],
      }));
    } catch { toast.error('Erro ao salvar desconto'); }
  }

  async function updateEval(id, status) {
    try {
      await api.patch(`/trades/evaluations/${id}`, { status });
      toast.success(status === 'approved' ? 'Aprovado!' : 'Rejeitado');
      fetchAll();
    } catch { toast.error('Erro ao atualizar avaliação'); }
  }

  const filteredRules = rules.filter(r =>
    !search || r.model.toLowerCase().includes(search.toLowerCase())
  );

  const inp = 'w-full px-3 py-2 rounded-xl text-sm text-white border outline-none';
  const inpStyle = { background: 'var(--bg)', borderColor: 'var(--border)' };

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold text-white mb-6">Trocas</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
        {[['rules', 'Modelos'], ['evaluations', 'Avaliações']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === key ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >{label}</button>
        ))}
      </div>

      {/* ── MODELOS ── */}
      {tab === 'rules' && (
        <div>
          <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar modelo..."
              className="px-3 py-2 rounded-xl text-sm text-white border outline-none w-64"
              style={inpStyle}
            />
            <button onClick={() => setShowRuleForm(v => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--primary)' }}>
              <Plus size={14} /> Adicionar modelo
            </button>
          </div>

          {showRuleForm && (
            <form onSubmit={saveRule} className="mb-4 p-4 rounded-2xl border flex items-end gap-3 flex-wrap" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <div className="flex-1 min-w-40">
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Modelo *</label>
                <input value={ruleForm.model} onChange={e => setRuleForm(p => ({ ...p, model: e.target.value }))} placeholder="Ex: iPhone 12 Pro" className={inp} style={inpStyle} />
              </div>
              <div className="w-28">
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Armazenamento</label>
                <input value={ruleForm.storage} onChange={e => setRuleForm(p => ({ ...p, storage: e.target.value }))} placeholder="128GB" className={inp} style={inpStyle} />
              </div>
              <div className="w-36">
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Valor mínimo (R$)</label>
                <input type="number" step="0.01" value={ruleForm.min_value} onChange={e => setRuleForm(p => ({ ...p, min_value: e.target.value }))} placeholder="0,00" className={inp} style={inpStyle} />
              </div>
              <div className="w-36">
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Valor máximo (R$)</label>
                <input type="number" step="0.01" value={ruleForm.max_value} onChange={e => setRuleForm(p => ({ ...p, max_value: e.target.value }))} placeholder="0,00" className={inp} style={inpStyle} />
              </div>
              <button type="submit" className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--primary)' }}>Salvar</button>
              <button type="button" onClick={() => setShowRuleForm(false)} className="px-4 py-2.5 rounded-xl text-sm border" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>Cancelar</button>
            </form>
          )}

          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
                  <th className="text-left px-4 py-3 font-medium w-8" style={{ color: 'var(--muted)' }}></th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--muted)' }}>Modelo</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--muted)' }}>Armazenamento</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--muted)' }}>Valor mínimo</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--muted)' }}>Valor máximo</th>
                  <th className="text-left px-4 py-3 font-medium w-24" style={{ color: 'var(--muted)' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map(r => (
                  <>
                    {/* Main row */}
                    <tr key={r.id} className="border-b hover:bg-white/[0.02]" style={{ borderColor: 'var(--border)' }}>
                      {/* Expand toggle */}
                      <td className="px-3 py-3 text-center">
                        <button onClick={() => toggleExpand(r.model)} className="text-gray-500 hover:text-white transition">
                          {expandedModel === r.model ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>

                      {editingId === r.id ? (
                        <>
                          <td className="px-4 py-2">
                            <input value={editForm.model} onChange={e => setEditForm(p => ({ ...p, model: e.target.value }))} className={inp} style={inpStyle} />
                          </td>
                          <td className="px-4 py-2">
                            <input value={editForm.storage} onChange={e => setEditForm(p => ({ ...p, storage: e.target.value }))} placeholder="Todos" className={inp} style={inpStyle} />
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" step="0.01" value={editForm.min_value} onChange={e => setEditForm(p => ({ ...p, min_value: e.target.value }))} className={inp} style={inpStyle} />
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" step="0.01" value={editForm.max_value} onChange={e => setEditForm(p => ({ ...p, max_value: e.target.value }))} className={inp} style={inpStyle} />
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex gap-2">
                              <button onClick={() => saveEdit(r.id)} className="text-green-400 hover:text-green-300 p-1"><Check size={14} /></button>
                              <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-white p-1"><X size={14} /></button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-white font-medium">{r.model}</td>
                          <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{r.storage || 'Todos'}</td>
                          <td className="px-4 py-3 text-green-400">{formatBRL(r.min_value)}</td>
                          <td className="px-4 py-3 text-white font-medium">{formatBRL(r.max_value)}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => startEdit(r)} className="text-blue-400 hover:text-blue-300 p-1"><Pencil size={13} /></button>
                              <button onClick={() => deleteRule(r.id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={13} /></button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>

                    {/* Expanded deductions row */}
                    {expandedModel === r.model && (
                      <tr key={r.id + '-exp'} style={{ borderColor: 'var(--border)' }} className="border-b">
                        <td colSpan={6} className="px-6 py-3" style={{ background: 'var(--bg2)' }}>
                          <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>Descontos por defeito — {r.model}</p>
                          {!modelDeductions[r.model] ? (
                            <p className="text-xs" style={{ color: 'var(--muted)' }}>Carregando...</p>
                          ) : modelDeductions[r.model].length === 0 ? (
                            <p className="text-xs" style={{ color: 'var(--muted)' }}>Nenhum desconto cadastrado para este modelo.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {modelDeductions[r.model].map(d => (
                                <div key={d.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
                                  <span className="text-xs text-white">{d.item}</span>
                                  {editingDedId === d.id ? (
                                    <>
                                      <input
                                        type="number" step="0.01"
                                        value={editDedAmount}
                                        onChange={e => setEditDedAmount(e.target.value)}
                                        className="w-24 px-2 py-0.5 rounded text-xs text-white border outline-none"
                                        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                                      />
                                      <button onClick={() => saveDedEdit(d)} className="text-green-400 hover:text-green-300"><Check size={11} /></button>
                                      <button onClick={() => setEditingDedId(null)} className="text-gray-500 hover:text-white"><X size={11} /></button>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-xs text-red-400 font-medium">− {formatBRL(d.amount)}</span>
                                      <button onClick={() => { setEditingDedId(d.id); setEditDedAmount(d.amount); }} className="text-blue-400 hover:text-blue-300 opacity-70 hover:opacity-100"><Pencil size={10} /></button>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {filteredRules.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>
                    {search ? 'Nenhum modelo encontrado' : 'Nenhuma regra cadastrada'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>{filteredRules.length} modelos · clique na seta para ver descontos por defeito</p>
        </div>
      )}

      {/* ── AVALIAÇÕES ── */}
      {tab === 'evaluations' && (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <thead><tr className="border-b" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              {['Cliente', 'Aparelho', 'Estimativa', 'Status', 'Ações'].map(h => <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: 'var(--muted)' }}>{h}</th>)}
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
                        {{ pending: 'Pendente', reviewing: 'Revisando', approved: 'Aprovado', rejected: 'Rejeitado' }[ev.status]}
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
