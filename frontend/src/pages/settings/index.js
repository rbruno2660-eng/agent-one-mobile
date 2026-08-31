import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';

const TABS = [
  { key: 'agent', label: 'Agente' },
  { key: 'team', label: 'Equipe' },
  { key: 'app', label: 'App iPhone' },
];

function Field({ label, hint, ...props }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>{label}</label>
      {hint && <p className="text-xs mb-1.5" style={{ color: 'var(--muted)', opacity: 0.7 }}>{hint}</p>}
      {props.textarea
        ? <textarea {...props} rows={props.rows || 4} className="w-full px-3 py-2.5 rounded-xl text-sm text-white border outline-none resize-none" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }} />
        : <input {...props} className="w-full px-3 py-2.5 rounded-xl text-sm text-white border outline-none" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }} />
      }
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState('agent');
  const [agent, setAgent] = useState(null);
  const [agentForm, setAgentForm] = useState({});
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'seller' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/agents').then(r => {
      if (r?.data) {
        const d = r.data;
        const merged = {
          name: d.name || '',
          persona: d.persona || '',
          mission: d.settings?.mission || '',
          handoff_criteria: d.settings?.handoff_criteria || '',
          _id: d.id,
        };
        setAgent(merged);
        setAgentForm(merged);
      }
    }).catch(() => null);
  }, []);

  useEffect(() => {
    if (tab === 'team') {
      api.get('/users').then(r => setUsers(r.data)).catch(() => {});
    }
  }, [tab]);

  async function saveAgent(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/agents', {
        name: agentForm.name,
        persona: agentForm.persona,
        settings: {
          mission: agentForm.mission,
          handoff_criteria: agentForm.handoff_criteria,
        },
      });
      toast.success('Configurações do agente salvas!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  }

  async function createUser(e) {
    e.preventDefault();
    if (!newUser.name || !newUser.email || !newUser.password) return toast.error('Preencha todos os campos');
    try {
      await api.post('/users', newUser);
      toast.success('Usuário criado');
      setNewUser({ name: '', email: '', password: '', role: 'seller' });
      api.get('/users').then(r => setUsers(r.data)).catch(() => {});
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao criar usuário');
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-xl font-bold text-white mb-6">Configurações</h1>

      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.key ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── AGENTE ── */}
      {tab === 'agent' && (
        <form onSubmit={saveAgent} className="space-y-5">
          <p className="text-xs p-3 rounded-xl" style={{ background: 'rgba(59,130,246,0.1)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)' }}>
            Todas as alterações aqui entram em vigor imediatamente — o prompt é reconstruído a cada mensagem nova.
          </p>

          <Field label="Nome do agente" placeholder="Ex: Sofia, Max, Ana"
            value={agentForm.name || ''} onChange={e => setAgentForm(p => ({ ...p, name: e.target.value }))} />

          <Field label="Persona / estilo de atendimento"
            hint="Descreva o tom: formal, descontraído, direto, etc."
            textarea rows={3}
            value={agentForm.persona || ''} onChange={e => setAgentForm(p => ({ ...p, persona: e.target.value }))} />

          <Field label="Missão principal"
            hint="O que o agente deve tentar fazer em cada conversa?"
            textarea rows={3}
            value={agentForm.mission || ''} onChange={e => setAgentForm(p => ({ ...p, mission: e.target.value }))} />

          <Field label="Critérios para transferir ao humano"
            hint="Ex: cliente irritado, troca acima de R$ 2000, pergunta sobre processo judicial"
            textarea rows={3}
            value={agentForm.handoff_criteria || ''} onChange={e => setAgentForm(p => ({ ...p, handoff_criteria: e.target.value }))} />

          <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--primary)' }}>
            <Save size={14} /> Salvar configurações
          </button>
        </form>
      )}

      {/* ── EQUIPE ── */}
      {tab === 'team' && (
        <div className="space-y-6">
          {/* Create user */}
          <div className="rounded-2xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            <h3 className="text-sm font-semibold text-white mb-4">Adicionar membro</h3>
            <form onSubmit={createUser} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nome" placeholder="Nome completo" value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} />
                <Field label="E-mail" type="email" placeholder="email@loja.com" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Senha temporária" type="password" placeholder="Mín. 8 caracteres" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Função</label>
                  <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white border outline-none" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
                    {['manager','seller','service','viewer'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--primary)' }}>Criar usuário</button>
            </form>
          </div>

          {/* User list */}
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-sm">
              <thead><tr className="border-b" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
                {['Nome','E-mail','Função','Status'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--muted)' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b hover:bg-white/[0.02]" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3 text-white font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{u.email}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-md" style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' }}>{u.role}</span></td>
                    <td className="px-4 py-3"><span className="text-xs" style={{ color: u.active ? '#22c55e' : '#f87171' }}>{u.active ? 'Ativo' : 'Inativo'}</span></td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-xs" style={{ color: 'var(--muted)' }}>Nenhum membro</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── APP IPHONE ── */}
      {tab === 'app' && (
        <div className="space-y-5">
          <div className="rounded-2xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            <h3 className="text-sm font-semibold text-white mb-1">Link do app</h3>
            <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>Compartilhe este link com a equipe para acessar o sistema.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs px-3 py-2.5 rounded-xl break-all" style={{ background: 'var(--bg)', color: '#60a5fa', border: '1px solid var(--border)' }}>
                https://agent-one-mobile.vercel.app
              </code>
              <button
                onClick={() => { navigator.clipboard.writeText('https://agent-one-mobile.vercel.app'); }}
                className="px-3 py-2.5 rounded-xl text-xs font-medium border transition hover:bg-white/5 whitespace-nowrap"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              >
                Copiar
              </button>
            </div>
          </div>

          <div className="rounded-2xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            <h3 className="text-sm font-semibold text-white mb-3">Como instalar no iPhone</h3>
            <p className="text-xs mb-4 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>
              ⚠️ Use o <strong>Safari</strong> — no Chrome do iPhone não é possível adicionar à tela de início.
            </p>
            <ol className="space-y-4">
              {[
                { step: '1', title: 'Abra o link no Safari', desc: 'Cole https://agent-one-mobile.vercel.app na barra de endereços do Safari.' },
                { step: '2', title: 'Toque em Compartilhar', desc: 'Toque no ícone ↑ (seta para cima) na barra inferior do Safari.' },
                { step: '3', title: 'Adicionar à Tela de Início', desc: 'Role o menu para baixo e toque em "Adicionar à Tela de Início".' },
                { step: '4', title: 'Confirme', desc: 'Mantenha o nome "Agent One" e toque em "Adicionar" no canto superior direito.' },
              ].map(item => (
                <li key={item.step} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">{item.step}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-2xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            <h3 className="text-sm font-semibold text-white mb-2">Login padrão para a equipe</h3>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Cada membro usa o próprio e-mail e senha criados na aba <strong className="text-white">Equipe</strong>. Crie os usuários antes de enviar o link.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

SettingsPage.getLayout = (page) => <Layout>{page}</Layout>;
