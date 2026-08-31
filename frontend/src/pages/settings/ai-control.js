import { useEffect, useState, useCallback } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Power, Clock, Calendar, MessageSquare, Pause, Play, Loader } from 'lucide-react';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const TIMEZONES = ['America/Sao_Paulo', 'America/Manaus', 'America/Belem', 'America/Fortaleza', 'America/Recife'];

const DEFAULT_SLOTS = DAYS.map((_, i) => ({
  day_of_week: i,
  start_time: '08:00',
  end_time: '18:00',
  active: i >= 1 && i <= 5, // Seg–Sex habilitado por padrão
}));

function StatusBadge({ active, paused }) {
  if (paused) return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-3 w-3">
        <span className="animate-pulse absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#f59e0b' }} />
        <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: '#f59e0b' }} />
      </span>
      <span className="text-sm font-semibold" style={{ color: '#f59e0b' }}>Pausada</span>
    </div>
  );
  if (active) return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#10b981' }} />
        <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: '#10b981' }} />
      </span>
      <span className="text-sm font-semibold" style={{ color: '#10b981' }}>Ativa</span>
    </div>
  );
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-3 w-3">
        <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: '#ef4444' }} />
      </span>
      <span className="text-sm font-semibold" style={{ color: '#ef4444' }}>Inativa</span>
    </div>
  );
}

export default function AIControlPage() {
  const [config, setConfig] = useState(null);
  const [slots, setSlots] = useState(DEFAULT_SLOTS);
  const [offlineMsg, setOfflineMsg] = useState('');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [mode, setMode] = useState('always_on');
  const [saving, setSaving] = useState(false);
  const [pauseLoading, setPauseLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get('/ai-config');
      const d = r.data;
      setConfig(d);
      setMode(d.mode || 'always_on');
      setOfflineMsg(d.offline_message || '');
      setTimezone(d.timezone || 'America/Sao_Paulo');
      if (d.slots && d.slots.length > 0) {
        // Merge slots com defaults (preenche dias sem slot)
        const merged = DEFAULT_SLOTS.map(def => {
          const found = d.slots.find(s => parseInt(s.day_of_week) === def.day_of_week);
          return found ? {
            day_of_week: parseInt(found.day_of_week),
            start_time: String(found.start_time).slice(0, 5),
            end_time: String(found.end_time).slice(0, 5),
            active: found.active,
          } : { ...def, active: false };
        });
        setSlots(merged);
      }
    } catch {
      toast.error('Erro ao carregar configuração');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isPaused = config?.pause_until && new Date(config.pause_until) > new Date();

  async function toggleManual() {
    try {
      const newOverride = config?.manual_override === 'inactive' ? 'active' : 'inactive';
      const r = await api.patch('/ai-config', { manual_override: newOverride, mode });
      setConfig(r.data);
      toast.success(newOverride === 'active' ? 'IA ativada manualmente!' : 'IA desativada manualmente!');
    } catch {
      toast.error('Erro ao alterar status');
    }
  }

  async function clearOverride() {
    try {
      const r = await api.patch('/ai-config', { manual_override: null, mode });
      setConfig(r.data);
      toast.success('Override removido — seguindo modo configurado');
    } catch {
      toast.error('Erro ao remover override');
    }
  }

  async function pause(hours) {
    setPauseLoading(true);
    try {
      const r = await api.post('/ai-config/pause', { hours });
      setConfig(r.data);
      toast.success(`IA pausada por ${hours}h`);
    } catch {
      toast.error('Erro ao pausar');
    } finally {
      setPauseLoading(false);
    }
  }

  async function resumeFromPause() {
    setPauseLoading(true);
    try {
      const r = await api.delete('/ai-config/pause');
      setConfig(r.data);
      toast.success('Pausa cancelada!');
    } catch {
      toast.error('Erro ao retomar');
    } finally {
      setPauseLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      await api.patch('/ai-config', { mode, offline_message: offlineMsg, timezone });
      if (mode === 'scheduled') {
        await api.put('/ai-config/schedule', { slots });
      }
      await load();
      toast.success('Configurações salvas!');
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  function updateSlot(dayIdx, field, value) {
    setSlots(prev => prev.map(s =>
      s.day_of_week === dayIdx ? { ...s, [field]: value } : s
    ));
  }

  const pauseUntilLabel = isPaused
    ? `Pausada até ${new Date(config.pause_until).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : null;

  if (!config) return (
    <div className="flex items-center justify-center h-64">
      <Loader size={20} className="animate-spin" style={{ color: 'var(--muted)' }} />
    </div>
  );

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Controle de Operação da IA</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Gerencie quando a Sofia responde automaticamente
        </p>
      </div>

      {/* Status card */}
      <div className="rounded-2xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Status atual</p>
            <StatusBadge active={config.is_active} paused={isPaused} />
            {isPaused && (
              <p className="text-xs mt-1" style={{ color: '#f59e0b' }}>{pauseUntilLabel}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {config.manual_override && (
              <button
                onClick={clearOverride}
                className="text-xs px-3 py-1.5 rounded-lg border transition hover:bg-white/5"
                style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}
              >
                Remover override
              </button>
            )}
            <button
              onClick={toggleManual}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition"
              style={{
                background: config.is_active && !isPaused ? '#ef444420' : '#10b98120',
                color: config.is_active && !isPaused ? '#ef4444' : '#10b981',
                border: `1px solid ${config.is_active && !isPaused ? '#ef444440' : '#10b98140'}`,
              }}
            >
              <Power size={14} />
              {config.is_active && !isPaused ? 'Desativar agora' : 'Ativar agora'}
            </button>
          </div>
        </div>

        {/* Pausa temporária */}
        <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-medium mb-3" style={{ color: 'var(--muted)' }}>
            <Pause size={12} className="inline mr-1" />
            Pausa temporária
          </p>
          <div className="flex gap-2 flex-wrap">
            {isPaused ? (
              <button
                onClick={resumeFromPause}
                disabled={pauseLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition"
                style={{ background: '#10b98120', color: '#10b981', border: '1px solid #10b98140' }}
              >
                <Play size={13} /> Retomar agora
              </button>
            ) : (
              [1, 2, 4, 8].map(h => (
                <button
                  key={h}
                  onClick={() => pause(h)}
                  disabled={pauseLoading}
                  className="px-3 py-1.5 rounded-xl text-sm transition hover:bg-white/5 border"
                  style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}
                >
                  {h}h
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modo de operação */}
      <div className="rounded-2xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Clock size={14} style={{ color: 'var(--muted)' }} />
          <p className="text-sm font-semibold text-white">Modo de operação</p>
        </div>

        <div className="space-y-2">
          {[
            { value: 'always_on',  label: 'Sempre ativa',        desc: 'A IA responde 24h por dia, 7 dias por semana' },
            { value: 'scheduled',  label: 'Por horário',          desc: 'A IA responde apenas nos horários configurados abaixo' },
            { value: 'always_off', label: 'Sempre desativada',    desc: 'A IA não responde — apenas atendimento humano' },
          ].map(opt => (
            <label
              key={opt.value}
              className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition hover:bg-white/5"
              style={{ border: `1px solid ${mode === opt.value ? '#2563eb' : 'var(--border)'}`, background: mode === opt.value ? '#2563eb10' : 'transparent' }}
            >
              <input
                type="radio"
                name="mode"
                value={opt.value}
                checked={mode === opt.value}
                onChange={() => setMode(opt.value)}
                className="mt-0.5"
                style={{ accentColor: '#2563eb' }}
              />
              <div>
                <p className="text-sm font-medium text-white">{opt.label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Agenda semanal */}
      {mode === 'scheduled' && (
        <div className="rounded-2xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={14} style={{ color: 'var(--muted)' }} />
            <p className="text-sm font-semibold text-white">Horário de funcionamento</p>
          </div>

          <div className="space-y-2">
            {slots.map(slot => (
              <div key={slot.day_of_week} className="flex items-center gap-3">
                <label className="flex items-center gap-2 w-14 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={slot.active}
                    onChange={e => updateSlot(slot.day_of_week, 'active', e.target.checked)}
                    style={{ accentColor: '#2563eb' }}
                  />
                  <span className="text-sm" style={{ color: slot.active ? '#fff' : 'var(--muted)' }}>
                    {DAYS[slot.day_of_week]}
                  </span>
                </label>

                {slot.active ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={slot.start_time}
                      onChange={e => updateSlot(slot.day_of_week, 'start_time', e.target.value)}
                      className="px-2 py-1 rounded-lg text-sm text-white border outline-none"
                      style={{ background: 'var(--bg)', borderColor: 'var(--border)', colorScheme: 'dark' }}
                    />
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>até</span>
                    <input
                      type="time"
                      value={slot.end_time}
                      onChange={e => updateSlot(slot.day_of_week, 'end_time', e.target.value)}
                      className="px-2 py-1 rounded-lg text-sm text-white border outline-none"
                      style={{ background: 'var(--bg)', borderColor: 'var(--border)', colorScheme: 'dark' }}
                    />
                  </div>
                ) : (
                  <span className="text-xs flex-1" style={{ color: 'var(--muted)' }}>Fechado</span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Fuso horário</label>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm text-white border outline-none"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
            >
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Mensagem fora do horário */}
      <div className="rounded-2xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare size={14} style={{ color: 'var(--muted)' }} />
          <p className="text-sm font-semibold text-white">Mensagem fora do horário</p>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
          Enviada automaticamente quando a IA está inativa e chega uma mensagem nova
        </p>
        <textarea
          value={offlineMsg}
          onChange={e => setOfflineMsg(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Olá! Estamos fora do horário de atendimento..."
          className="w-full px-3 py-2.5 rounded-xl text-sm text-white border outline-none resize-none"
          style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
        />
        <p className="text-xs text-right mt-1" style={{ color: 'var(--muted)' }}>{offlineMsg.length}/500</p>
      </div>

      <button
        onClick={saveSettings}
        disabled={saving}
        className="w-full py-3 rounded-xl font-semibold text-sm text-white transition flex items-center justify-center gap-2"
        style={{ background: saving ? '#1d4ed8' : '#2563eb', opacity: saving ? 0.7 : 1 }}
      >
        {saving ? <Loader size={15} className="animate-spin" /> : null}
        {saving ? 'Salvando...' : 'Salvar configurações'}
      </button>
    </div>
  );
}

AIControlPage.getLayout = (page) => <Layout>{page}</Layout>;
