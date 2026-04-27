import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { PlusCircle, Pencil, Trash2, CreditCard, X, Check } from 'lucide-react';

// endereço base da API
const API = 'http://127.0.0.1:5000';
// Valores com acento adicionados ao ENUM; manter alinhado com account_type_enum
// lista dos tipos de conta disponíveis para criar
const TIPOS = ['Corrente', 'Poupança', 'Investimento', 'Dinheiro', 'Cartão de Crédito'];

// Mapa para exibição (BD pode ter versão sem acento em dados antigos)
// esse mapa normaliza os tipos do banco para sempre mostrar com acento correto
const LABEL_TIPO = {
  'Corrente': 'Corrente', 'Poupanca': 'Poupança', 'Poupança': 'Poupança',
  'Investimento': 'Investimento', 'Dinheiro': 'Dinheiro',
  'Cartao de Credito': 'Cartão de Crédito', 'Cartão de Crédito': 'Cartão de Crédito',
};

// cores do badge para cada tipo de conta
const COR_TIPO = {
  'Corrente':           'bg-blue-100 text-blue-700',
  'Poupança':           'bg-green-100 text-green-700',
  'Investimento':       'bg-purple-100 text-purple-700',
  'Dinheiro':           'bg-yellow-100 text-yellow-700',
  'Cartão de Crédito':  'bg-red-100 text-red-700',
};

// estado vazio do formulário para quando vou criar uma nova conta
const formVazio = { account_name: '', account_type: 'Corrente', initial_balance: '', bank_name: '', account_number: '' };

export default function Contas() {
  // lê o utilizador guardado no localStorage para saber o user_id
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  // lista de contas do utilizador
  const [contas, setContas] = useState([]);

  // dados do formulário de criação/edição
  const [form, setForm] = useState(formVazio);

  // guarda o id da conta que está a ser editada (null = modo criação)
  const [editId, setEditId] = useState(null);

  // controla se o formulário está visível
  const [mostrarForm, setMostrarForm] = useState(false);

  // guarda mensagem de erro para mostrar ao utilizador
  const [erro, setErro] = useState('');

  // quando o componente monta, busco as contas automaticamente
  useEffect(() => { buscar(); }, []);

  // busca as contas do utilizador na API
  const buscar = async () => {
    try {
      const res = await axios.get(`${API}/contas/${usuario.user_id}`);
      setContas(res.data);
    } catch { setErro('Erro ao carregar contas.'); }
  };

  // prepara o formulário no modo de criar nova conta
  const abrirNovo = () => { setForm(formVazio); setEditId(null); setMostrarForm(true); setErro(''); };

  // prepara o formulário no modo de editar, carregando os dados da conta selecionada
  const abrirEditar = (c) => {
    setForm({ account_name: c.account_name, account_type: c.account_type, initial_balance: c.initial_balance, bank_name: c.bank_name || '', account_number: c.account_number || '' });
    setEditId(c.account_id);
    setMostrarForm(true);
    setErro('');
  };

  // salva a conta: faz PUT se for edição ou POST se for criação nova
  const salvar = async (e) => {
    e.preventDefault();
    setErro('');
    try {
      if (editId) {
        await axios.put(`${API}/contas/${editId}`, form);
      } else {
        await axios.post(`${API}/contas`, { ...form, user_id: usuario.user_id });
      }
      setMostrarForm(false);
      buscar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar conta.');
    }
  };

  // remove uma conta após confirmação do utilizador
  const remover = async (id) => {
    if (!confirm('Tem a certeza que deseja remover esta conta?')) return;
    try {
      await axios.delete(`${API}/contas/${id}`);
      buscar();
    } catch { setErro('Erro ao remover conta.'); }
  };

  // calcula o saldo total somando o saldo atual de todas as contas
  const saldoTotal = contas.reduce((s, c) => s + parseFloat(c.current_balance || 0), 0);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <CreditCard className="text-blue-600" /> Contas Financeiras
            </h1>
            {/* exibe o saldo total formatado em reais */}
            <p className="text-gray-500 text-sm mt-1">
              Saldo total: <span className="font-bold text-blue-700">
                R$ {saldoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </p>
          </div>
          <button onClick={abrirNovo}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium">
            <PlusCircle size={16} /> Nova Conta
          </button>
        </div>

        {/* mostra erro se tiver algum */}
        {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">{erro}</div>}

        {/* Formulário de criação/edição, só aparece quando mostrarForm é true */}
        {mostrarForm && (
          <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              {/* título muda dependendo se está a editar ou criar */}
              <h3 className="font-bold text-gray-800">{editId ? 'Editar Conta' : 'Nova Conta'}</h3>
              <button onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={salvar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Nome da Conta *</label>
                <input required minLength={3} maxLength={50}
                  className="input" placeholder="Ex: Nubank, Caixa..."
                  value={form.account_name} onChange={e => setForm(f => ({ ...f, account_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Tipo de Conta *</label>
                <select required className="input"
                  value={form.account_type} onChange={e => setForm(f => ({ ...f, account_type: e.target.value }))}>
                  {TIPOS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              {/* o campo de saldo inicial só aparece na criação, não na edição */}
              {!editId && (
                <div>
                  <label className="label">Saldo Inicial (R$) *</label>
                  <input required type="number" min="0" step="0.01" className="input" placeholder="0.00"
                    value={form.initial_balance} onChange={e => setForm(f => ({ ...f, initial_balance: e.target.value }))}
                  />
                </div>
              )}
              <div>
                <label className="label">Banco/Instituição (opcional)</label>
                <input maxLength={100} className="input" placeholder="Ex: Bradesco"
                  value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Número da Conta (opcional)</label>
                <input maxLength={30} className="input" placeholder="Ex: 12345-6"
                  value={form.account_number} onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2 flex gap-3 justify-end">
                <button type="button" onClick={() => setMostrarForm(false)}
                  className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-50 text-sm">Cancelar</button>
                <button type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 flex items-center gap-1">
                  <Check size={15} /> {editId ? 'Guardar' : 'Criar Conta'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de contas em grelha de 2 colunas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* se não tiver contas, exibe mensagem de aviso */}
          {contas.length === 0 ? (
            <p className="text-gray-400 text-center py-12 md:col-span-2">Nenhuma conta registada.</p>
          ) : contas.map(c => (
            <div key={c.account_id} className="bg-white rounded-2xl shadow-sm border p-5 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {/* badge colorido com o tipo de conta */}
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${COR_TIPO[LABEL_TIPO[c.account_type] || c.account_type] || 'bg-gray-100 text-gray-700'}`}>
                    {LABEL_TIPO[c.account_type] || c.account_type}
                  </span>
                </div>
                <h3 className="font-bold text-gray-800">{c.account_name}</h3>
                {/* mostra banco e número da conta se existirem */}
                {c.bank_name && <p className="text-xs text-gray-400">{c.bank_name}{c.account_number ? ` · ${c.account_number}` : ''}</p>}
                {/* saldo atual formatado */}
                <p className="text-lg font-bold mt-2 text-blue-700">
                  R$ {parseFloat(c.current_balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-400">Saldo inicial: R$ {parseFloat(c.initial_balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              {/* botões de editar e remover cada conta */}
              <div className="flex gap-2">
                <button onClick={() => abrirEditar(c)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil size={16} /></button>
                <button onClick={() => remover(c.account_id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* estilos inline reutilizáveis para input e label em todo o formulário */}
      <style>{`.input { width: 100%; border: 1px solid #d1d5db; padding: 0.625rem 0.75rem; border-radius: 0.5rem; outline: none; font-size: 0.875rem; } .input:focus { ring: 2px; border-color: #3b82f6; } .label { display: block; font-size: 0.75rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }`}</style>
    </Layout>
  );
}
