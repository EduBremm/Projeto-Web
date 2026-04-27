import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { PlusCircle, Trash2, ArrowLeftRight, X, Check } from 'lucide-react';

// endereço da API
const API = 'http://127.0.0.1:5000';

// estado vazio do formulário, a data já vem preenchida com hoje
const formVazio = { amount: '', from_account_id: '', to_account_id: '', description: '', transfer_date: new Date().toISOString().slice(0, 10) };

export default function Transferencias() {
  // lê o utilizador do localStorage para obter o user_id
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  // lista de transferências registadas
  const [transferencias, setTransferencias] = useState([]);

  // lista de contas do utilizador para os selects de origem e destino
  const [contas, setContas] = useState([]);

  // dados do formulário de nova transferência
  const [form, setForm] = useState(formVazio);

  // controla visibilidade do formulário
  const [mostrarForm, setMostrarForm] = useState(false);

  // guarda mensagem de erro
  const [erro, setErro] = useState('');

  // ao montar, carrego tanto as transferências como as contas
  useEffect(() => { buscar(); buscarContas(); }, []);

  // busca o histórico de transferências do utilizador
  const buscar = async () => {
    try {
      const res = await axios.get(`${API}/transferencias/${usuario.user_id}`);
      setTransferencias(res.data);
    } catch { setErro('Erro ao carregar transferências.'); }
  };

  // busca as contas para preencher os selects do formulário
  const buscarContas = async () => {
    try {
      const res = await axios.get(`${API}/contas/${usuario.user_id}`);
      setContas(res.data);
    } catch {}
  };

  // essa função valida e envia o formulário de transferência
  const salvar = async (e) => {
    e.preventDefault();
    setErro('');
    // valida que origem e destino são diferentes
    if (form.from_account_id === form.to_account_id)
      return setErro('A conta de origem e destino devem ser diferentes.');
    // valida que o valor é positivo
    if (!form.amount || form.amount <= 0)
      return setErro('O valor deve ser positivo.');
    // não permite datas no futuro
    const hoje = new Date().toISOString().slice(0, 10);
    if (form.transfer_date > hoje)
      return setErro('A data não pode ser no futuro.');
    try {
      await axios.post(`${API}/transferencias`, { ...form, user_id: usuario.user_id });
      setMostrarForm(false);
      setForm(formVazio);
      // atualiza tanto o histórico como os saldos das contas
      buscar();
      buscarContas();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao registar transferência.');
    }
  };

  // remove transferência e reverte os saldos das contas envolvidas
  const remover = async (id) => {
    if (!confirm('Remover esta transferência? Os saldos serão revertidos.')) return;
    try {
      await axios.delete(`${API}/transferencias/${id}`);
      // atualiza lista e saldos após remoção
      buscar();
      buscarContas();
    } catch { setErro('Erro ao remover transferência.'); }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ArrowLeftRight className="text-blue-600" /> Transferências
          </h1>
          <button onClick={() => { setMostrarForm(true); setErro(''); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium">
            <PlusCircle size={16} /> Nova Transferência
          </button>
        </div>

        {/* exibe erro se tiver */}
        {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">{erro}</div>}

        {/* formulário de nova transferência, só aparece quando ativado */}
        {mostrarForm && (
          <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800">Nova Transferência</h3>
              <button onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={salvar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Conta de Origem *</label>
                <select required className="input"
                  value={form.from_account_id} onChange={e => setForm(f => ({ ...f, from_account_id: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {/* mostra o saldo atual de cada conta na origem */}
                  {contas.map(c => <option key={c.account_id} value={c.account_id}>{c.account_name} (R$ {parseFloat(c.current_balance).toFixed(2)})</option>)}
                </select>
              </div>
              <div>
                <label className="label">Conta de Destino *</label>
                <select required className="input"
                  value={form.to_account_id} onChange={e => setForm(f => ({ ...f, to_account_id: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {/* filtra a conta de origem da lista de destino para evitar transferência para si mesmo */}
                  {contas.filter(c => String(c.account_id) !== String(form.from_account_id))
                    .map(c => <option key={c.account_id} value={c.account_id}>{c.account_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Valor (R$) *</label>
                <input required type="number" min="0.01" step="0.01" className="input" placeholder="0.00"
                  value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Data *</label>
                {/* limite máximo é hoje, não permite datas futuras */}
                <input required type="date" className="input"
                  max={new Date().toISOString().slice(0, 10)}
                  value={form.transfer_date} onChange={e => setForm(f => ({ ...f, transfer_date: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Descrição (opcional)</label>
                <input maxLength={255} className="input" placeholder="Ex: Reserva de emergência"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2 flex gap-3 justify-end">
                <button type="button" onClick={() => setMostrarForm(false)}
                  className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-50 text-sm">Cancelar</button>
                <button type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 flex items-center gap-1">
                  <Check size={15} /> Transferir
                </button>
              </div>
            </form>
          </div>
        )}

        {/* lista do histórico de transferências */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          {transferencias.length === 0 ? (
            <p className="text-gray-400 text-center py-12">Nenhuma transferência registada.</p>
          ) : (
            <div className="divide-y">
              {transferencias.map(t => (
                <div key={t.transfer_id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                      <ArrowLeftRight size={18} />
                    </div>
                    <div>
                      {/* mostra as contas de origem e destino com seta entre elas */}
                      <p className="font-medium text-gray-800">
                        {t.from_account_name} → {t.to_account_name}
                      </p>
                      {t.description && <p className="text-xs text-gray-400">{t.description}</p>}
                      {/* formata a data para o formato brasileiro */}
                      <p className="text-xs text-gray-400">{new Date(t.transfer_date).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* valor da transferência em destaque */}
                    <span className="font-bold text-blue-700">
                      R$ {parseFloat(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <button onClick={() => remover(t.transfer_id)} className="p-2 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* estilos inline para campos do formulário */}
      <style>{`.input { width: 100%; border: 1px solid #d1d5db; padding: 0.625rem 0.75rem; border-radius: 0.5rem; outline: none; font-size: 0.875rem; } .label { display: block; font-size: 0.75rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }`}</style>
    </Layout>
  );
}
