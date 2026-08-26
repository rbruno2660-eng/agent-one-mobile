import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm mb-1.5 font-medium" style={{ color: 'var(--muted)' }}>
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ ...props }) {
  return (
    <input
      {...props}
      className="w-full px-4 py-3 rounded-xl text-sm text-white border outline-none focus:border-blue-500 transition"
      style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
    />
  );
}

function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className="w-full px-4 py-3 rounded-xl text-sm text-white border outline-none focus:border-blue-500 transition"
      style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
    >
      {children}
    </select>
  );
}

const IPHONE_MODELS = [
  'iPhone 13','iPhone 13 mini','iPhone 13 Pro','iPhone 13 Pro Max',
  'iPhone 14','iPhone 14 Plus','iPhone 14 Pro','iPhone 14 Pro Max',
  'iPhone 15','iPhone 15 Plus','iPhone 15 Pro','iPhone 15 Pro Max',
  'iPhone 16','iPhone 16 Plus','iPhone 16 Pro','iPhone 16 Pro Max',
];

const STORAGES = ['64GB','128GB','256GB','512GB','1TB'];

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    model: '',
    variant: '',
    storage: '',
    color: '',
    condition: 'new',
    battery_health: '',
    warranty: '',
    quantity: 0,
    table_price: '',
    current_price: '',
    min_price: '',
    pix_price: '',
  });
  const [installments, setInstallments] = useState([]);

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function addInstallment() {
    setInstallments(prev => [...prev, { installments: '', installment_value: '', total: '' }]);
  }

  function removeInstallment(idx) {
    setInstallments(prev => prev.filter((_, i) => i !== idx));
  }

  function setInstallmentField(idx, field, value) {
    setInstallments(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.model) return toast.error('Informe o modelo');
    if (!form.current_price) return toast.error('Informe o preço atual');
    if (!form.min_price) return toast.error('Informe o preço mínimo');
    if (parseFloat(form.min_price) > parseFloat(form.current_price)) return toast.error('Preço mínimo não pode ser maior que o preço atual');

    setLoading(true);
    try {
      const payload = {
        ...form,
        quantity: parseInt(form.quantity) || 0,
        table_price: parseFloat(form.table_price) || parseFloat(form.current_price),
        current_price: parseFloat(form.current_price),
        min_price: parseFloat(form.min_price),
        pix_price: form.pix_price ? parseFloat(form.pix_price) : undefined,
        battery_health: form.condition === 'used' && form.battery_health ? parseInt(form.battery_health) : undefined,
        installments: installments.filter(i => i.installments && i.installment_value).map(i => ({
          installments: parseInt(i.installments),
          installment_value: parseFloat(i.installment_value),
          total: parseFloat(i.total) || parseFloat(i.installment_value) * parseInt(i.installments),
        })),
      };

      await api.post('/products', payload);
      toast.success('Produto cadastrado com sucesso!');
      router.push('/catalog');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao cadastrar produto');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm mb-6 transition hover:text-white" style={{ color: 'var(--muted)' }}>
        <ChevronLeft size={16} /> Voltar
      </button>
      <h1 className="text-xl font-bold text-white mb-6">Novo produto</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identificação */}
        <Section title="Identificação">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Modelo" required>
              <Select value={form.model} onChange={e => set('model', e.target.value)} required>
                <option value="">Selecione</option>
                {IPHONE_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="Armazenamento">
              <Select value={form.storage} onChange={e => set('storage', e.target.value)}>
                <option value="">Selecione</option>
                {STORAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Condição" required>
              <Select value={form.condition} onChange={e => set('condition', e.target.value)}>
                <option value="new">Novo</option>
                <option value="used">Seminovo</option>
              </Select>
            </Field>
            <Field label="Cor">
              <Input value={form.color} onChange={e => set('color', e.target.value)} placeholder="Ex: Preto titânio" />
            </Field>
            {form.condition === 'used' && (
              <Field label="Saúde da bateria (%)">
                <Input type="number" min="0" max="100" value={form.battery_health} onChange={e => set('battery_health', e.target.value)} placeholder="Ex: 87" />
              </Field>
            )}
            <Field label="Garantia">
              <Input value={form.warranty} onChange={e => set('warranty', e.target.value)} placeholder="Ex: 12 meses Apple" />
            </Field>
          </div>
        </Section>

        {/* Estoque */}
        <Section title="Estoque">
          <Field label="Quantidade disponível" required>
            <Input type="number" min="0" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
          </Field>
        </Section>

        {/* Preços */}
        <Section title="Preços">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Preço tabela (referência)">
              <Input type="number" step="0.01" value={form.table_price} onChange={e => set('table_price', e.target.value)} placeholder="R$ 0,00" />
            </Field>
            <Field label="Preço atual (ofertado)" required>
              <Input type="number" step="0.01" value={form.current_price} onChange={e => set('current_price', e.target.value)} placeholder="R$ 0,00" />
            </Field>
            <Field label="Preço mínimo (piso)" required>
              <Input type="number" step="0.01" value={form.min_price} onChange={e => set('min_price', e.target.value)} placeholder="R$ 0,00" />
            </Field>
            <Field label="Preço Pix/à vista">
              <Input type="number" step="0.01" value={form.pix_price} onChange={e => set('pix_price', e.target.value)} placeholder="R$ 0,00" />
            </Field>
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
            O agente nunca oferta abaixo do preço mínimo.
          </p>
        </Section>

        {/* Parcelamento */}
        <Section title="Parcelamento (opcional)">
          <div className="space-y-2">
            {installments.map((inst, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  type="number" min="1" placeholder="Nº parcelas"
                  value={inst.installments}
                  onChange={e => setInstallmentField(idx, 'installments', e.target.value)}
                />
                <span className="text-sm" style={{ color: 'var(--muted)' }}>×</span>
                <Input
                  type="number" step="0.01" placeholder="Valor parcela"
                  value={inst.installment_value}
                  onChange={e => setInstallmentField(idx, 'installment_value', e.target.value)}
                />
                <button type="button" onClick={() => removeInstallment(idx)} className="text-red-400 hover:text-red-300 flex-shrink-0">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addInstallment}
              className="flex items-center gap-1.5 text-sm transition hover:text-white"
              style={{ color: 'var(--muted)' }}
            >
              <Plus size={14} /> Adicionar parcela
            </button>
          </div>
        </Section>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()} className="px-6 py-3 rounded-xl text-sm font-medium border transition hover:bg-white/5" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50" style={{ background: 'var(--primary)' }}>
            {loading ? 'Salvando...' : 'Salvar produto'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-2xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
      <h2 className="text-sm font-semibold text-white mb-4">{title}</h2>
      {children}
    </div>
  );
}

NewProductPage.getLayout = (page) => <Layout>{page}</Layout>;
