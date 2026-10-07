/**
 * Reativação de clientes inativos — Feature 5.
 * Mostra o status do cron diário e histórico de mensagens enviadas.
 */

import { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/router';
import api from '../lib/api';
import {
  RotateCcw, Clock, CheckCircle, AlertCircle, Users,
  MessageCircle, RefreshCw, Calendar
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div
      className="rounded-xl p-4 flex items-center gap-3"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}22` }}
      >
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <p className="text-xl font-bold text-white">{value}</p>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>{label}</p>
      </div>
    </div>
  );
}

export default function Reativacao() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/reactivation/history');
      setHistory(res.data || []);
    } catch {
      // Endpoint pode não existir ainda — mostra estado vazio sem erro
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadHistory();
  }, [user, loadHistory]);

  if (authLoading || !user) return null;

  const totalEnviadas = history.length;
  const hoje = history.filter(h => {
    const d = new Date(h.sent_at || h.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;
  const respondidas = history.filter(h => h.replied).length;

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#059669' + '22' }}>
              <RotateCcw size={18} style={{ color: '#34d399' }} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Reativação</h1>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Clientes inativos reconquistados automaticamente
              </p>
            </div>
          </div>
          <button
            onClick={loadHistory}
            className="p-2 rounded-lg transition-opacity hover:opacity-70"
            style={{ color: 'var(--muted)' }}
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Info do cron */}
        <div
          className="rounded-2xl p-4 mb-5 flex items-start gap-3"
          style={{ background: '#05966922', border: '1px solid #059669' }}
        >
          <Clock size={16} style={{ color: '#34d399', marginTop: 2 }} />
          <div>
            <p className="text-sm font-semibold text-white mb-1">Automação ativa</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Todo dia às <strong className="text-white">10:00</strong> o sistema identifica
              clientes sem resposta há mais de <strong className="text-white">30 dias</strong> e
              envia uma mensagem de reativação personalizada via WhatsApp.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatCard icon={Users}         label="Total enviadas"  value={totalEnviadas} color="#a78bfa" />
          <StatCard icon={Calendar}      label="Hoje"            value={hoje}          color="#60a5fa" />
          <StatCard icon={MessageCircle} label="Responderam"     value={respondidas}   color="#34d399" />
        </div>

        {/* Histórico */}
        <div>
          <p className="text-xs font-semibold mb-3" style={{ color: 'var(--muted)' }}>
            HISTÓRICO DE REATIVAÇÕES
          </p>

          {loading ? (
            <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
              <RefreshCw size={24} className="mx-auto mb-2 animate-spin" />
              <p className="text-sm">Carregando histórico…</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
              <RotateCcw size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-white mb-1">Nenhuma reativação ainda</p>
              <p className="text-sm">
                O cron roda todo dia às 10h.<br />
                Quando houver clientes inativos há 30+ dias, eles aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((h, i) => (
                <div
                  key={h.id || i}
                  className="rounded-xl p-3 flex items-center justify-between gap-3"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: h.replied ? '#05966922' : '#ffffff10' }}
                    >
                      {h.replied
                        ? <CheckCircle size={14} style={{ color: '#34d399' }} />
                        : <MessageCircle size={14} style={{ color: 'var(--muted)' }} />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {h.contact_name || h.phone}
                      </p>
                      {h.phone && h.contact_name && (
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>{h.phone}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {h.sent_at || h.created_at
                        ? new Date(h.sent_at || h.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                          })
                        : '—'
                      }
                    </p>
                    <p className="text-xs font-semibold" style={{ color: h.replied ? '#34d399' : 'var(--muted)' }}>
                      {h.replied ? 'Respondeu' : 'Enviada'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
