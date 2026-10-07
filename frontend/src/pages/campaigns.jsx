/**
 * Campanhas ativas — Feature 4.
 * Cria, gerencia e dispara campanhas de WhatsApp em massa.
 */

import { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/router';
import api from '../lib/api';
import {
  Megaphone, Plus, Send, Users, CheckCircle, Clock,
  AlertCircle, ChevronDown, ChevronUp, Trash2, RefreshCw
} from 'lucide-react';

const STATUS_BADGE = {
  draft:     { label: 'Rascunho',  bg: '#374151', text: '#9ca3af' },
  scheduled: { label: 'Agendada',  bg: '#1e3a5f', text: '#60a5fa' },
  sending:   { label: 'Enviando',  bg: '#78350f', text: '#fbbf24' },
  sent:      { label: 'Enviada',   bg: '#064e3b', text: '#34d399' },
  cancelled: { label: 'Cancelada', bg: '#3b0000', text: '#f87171' },
};

function StatusBadge({ status }) {
  const s = STATUS_BADGE[status] || STATUS_BADGE.draft;
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-semibold"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}

function CampaignCard({ campaign, onSend, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [phoneInput, setPhoneInput] = useState('');
  const [addingContacts, setAddingContacts] = useState(false);
  const [sending, setSending] = useState(false);

  const loadContacts = useCallback(async () => {
    try {
      const res = await api.get(`/campaigns/${campaign.id}/contacts`);
      setContacts(res.data);
    } catch {}
  }, [campaign.id]);

  useEffect(() => {
    if (expanded) loadContacts();
  }, [expanded, loadContacts]);

  const handleAddContacts = async () => {
    const phones = phoneInput
      .split(/[\n,;]+/)
      .map(p => p.trim())
      .filter(p => p.length > 6);
    if (!phones.length) return;
    setAddingContacts(true);
    try {
      await api.post(`/campaigns/${campaign.id}/contacts`, { phones });
      setPhoneInput('');
      await loadContacts();
    } catch {
      alert('Erro ao adicionar contatos');
    } finally {
      setAddingContacts(false);
    }
  };

  const handleSend = async () => {
    if (!confirm(`Disparar campanha "${campaign.name}" para ${campaign.total_contacts} contatos?`)) return;
    setSending(true);
    try {
      await api.post(`/campaigns/${campaign.id}/send`);
      await onRefresh();
    } catch (err) {
      alert(err?.response?.data?.error || 'Erro ao disparar campanha');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="rounded-2xl p-4 mb-3"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-white text-sm truncate">{campaign.name}</span>
            <StatusBadge status={campaign.status} />
          </div>
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--muted)' }}>
            <span className="flex items-center gap-1">
              <Users size={11} />
              {campaign.total_contacts || 0} contatos
            </span>
            {campaign.sent_count > 0 && (
              <span className="flex items-center gap-1">
                <CheckCircle size={11} />
                {campaign.sent_count} enviadas
              </span>
            )}
            {campaign.scheduled_at && (
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {new Date(campaign.scheduled_at).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
              </span>
            )}
          </div>
          <p
            className="text-xs mt-2 rounded p-2 line-clamp-2"
            style={{ background: '#ffffff10', color: 'var(--muted)' }}
          >
            {campaign.message_template}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {campaign.status === 'draft' && (
            <button
              onClick={handleSend}
              disabled={sending || parseInt(campaign.total_contacts) === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40"
              style={{ background: '#2563eb', color: '#fff' }}
            >
              <Send size={13} />
              {sending ? 'Enviando…' : 'Disparar'}
            </button>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ color: 'var(--muted)' }}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expandido: contatos */}
      {expanded && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>
            CONTATOS ({contacts.length})
          </p>

          {campaign.status === 'draft' && (
            <div className="mb-3">
              <textarea
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                placeholder={"Adicione telefones (um por linha)\n5511999998888\n5511988887777"}
                rows={3}
                className="w-full text-xs rounded-lg p-2 resize-none"
                style={{
                  background: '#ffffff08',
                  border: '1px solid var(--border)',
                  color: '#fff',
                  fontFamily: 'monospace',
                }}
              />
              <button
                onClick={handleAddContacts}
                disabled={addingContacts || !phoneInput.trim()}
                className="mt-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40"
                style={{ background: '#059669', color: '#fff' }}
              >
                {addingContacts ? 'Adicionando…' : '+ Adicionar contatos'}
              </button>
            </div>
          )}

          {contacts.length > 0 ? (
            <div className="max-h-36 overflow-y-auto space-y-1">
              {contacts.map(c => (
                <div
                  key={c.id}
                  className="flex items-center justify-between text-xs px-2 py-1 rounded"
                  style={{ background: '#ffffff08' }}
                >
                  <span style={{ color: 'var(--muted)' }}>{c.phone}</span>
                  <span className="text-xs" style={{ color: c.status === 'sent' ? '#34d399' : 'var(--muted)' }}>
                    {c.status || 'pending'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Nenhum contato ainda.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Campaigns() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', message_template: '', scheduled_at: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/campaigns');
      setCampaigns(res.data);
    } catch {
      setError('Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadCampaigns();
  }, [user, loadCampaigns]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.message_template.trim()) {
      setError('Nome e mensagem são obrigatórios');
      return;
    }
    setCreating(true);
    setError('');
    try {
      await api.post('/campaigns', {
        name: form.name.trim(),
        message_template: form.message_template.trim(),
        scheduled_at: form.scheduled_at || null,
      });
      setForm({ name: '', message_template: '', scheduled_at: '' });
      setShowForm(false);
      await loadCampaigns();
    } catch (err) {
      setError(err?.response?.data?.error || 'Erro ao criar campanha');
    } finally {
      setCreating(false);
    }
  };

  if (authLoading || !user) return null;

  const stats = {
    total: campaigns.length,
    draft: campaigns.filter(c => c.status === 'draft').length,
    sent:  campaigns.filter(c => c.status === 'sent').length,
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#7c3aed22' }}>
              <Megaphone size={18} style={{ color: '#a78bfa' }} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Campanhas</h1>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Disparo em massa via WhatsApp
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadCampaigns}
              className="p-2 rounded-lg transition-opacity hover:opacity-70"
              style={{ color: 'var(--muted)' }}
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={() => setShowForm(f => !f)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
              style={{ background: '#7c3aed', color: '#fff' }}
            >
              <Plus size={15} />
              Nova Campanha
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Total', value: stats.total, color: '#a78bfa' },
            { label: 'Rascunho', value: stats.draft, color: '#60a5fa' },
            { label: 'Enviadas', value: stats.sent, color: '#34d399' },
          ].map(s => (
            <div
              key={s.label}
              className="rounded-xl p-3 text-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Formulário nova campanha */}
        {showForm && (
          <div
            className="rounded-2xl p-4 mb-4"
            style={{ background: 'var(--surface)', border: '1px solid #7c3aed55' }}
          >
            <h2 className="text-sm font-bold text-white mb-3">Nova Campanha</h2>
            {error && (
              <div className="flex items-center gap-2 text-xs mb-3 p-2 rounded-lg" style={{ background: '#7f1d1d44', color: '#f87171' }}>
                <AlertCircle size={13} />
                {error}
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--muted)' }}>
                  NOME DA CAMPANHA
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Promoção de Outubro"
                  className="w-full text-sm px-3 py-2 rounded-xl"
                  style={{
                    background: '#ffffff08',
                    border: '1px solid var(--border)',
                    color: '#fff',
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--muted)' }}>
                  MENSAGEM
                  <span className="font-normal ml-1">(use {'{{nome}}'} para personalizar)</span>
                </label>
                <textarea
                  value={form.message_template}
                  onChange={e => setForm(f => ({ ...f, message_template: e.target.value }))}
                  placeholder={"Olá {{nome}}! 🎉 Temos uma oferta especial para você..."}
                  rows={4}
                  className="w-full text-sm px-3 py-2 rounded-xl resize-none"
                  style={{
                    background: '#ffffff08',
                    border: '1px solid var(--border)',
                    color: '#fff',
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--muted)' }}>
                  AGENDAMENTO (opcional)
                </label>
                <input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                  className="text-sm px-3 py-2 rounded-xl"
                  style={{
                    background: '#ffffff08',
                    border: '1px solid var(--border)',
                    color: '#fff',
                  }}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ background: '#7c3aed', color: '#fff' }}
                >
                  {creating ? 'Criando…' : 'Criar Campanha'}
                </button>
                <button
                  onClick={() => { setShowForm(false); setError(''); }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: '#ffffff10', color: '#fff' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de campanhas */}
        {loading ? (
          <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
            <RefreshCw size={24} className="mx-auto mb-2 animate-spin" />
            <p className="text-sm">Carregando campanhas…</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
            <Megaphone size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-white mb-1">Nenhuma campanha ainda</p>
            <p className="text-sm">Crie sua primeira campanha de disparo em massa.</p>
          </div>
        ) : (
          campaigns.map(c => (
            <CampaignCard
              key={c.id}
              campaign={c}
              onRefresh={loadCampaigns}
            />
          ))
        )}
      </div>
    </Layout>
  );
}
