import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { PlusCircle, Pencil, Trash2, TrendingUp, TrendingDown, X, Check } from 'lucide-react';

// endereço da API
const API = 'http://127.0.0.1:5000';

// tipos de investimento disponíveis
const TIPOS = ['Ações', 'Fundos Imobiliários', 'Criptomoedas', 'Renda Fixa', 'Imóveis', 'Outros'];

// cores dos badges para cada tipo de investimento
const COR_TIPO = {
  'Ações':              'bg-blue-100 text-blue-700',
  'Fundos Imobiliários':'bg-green-100 text-green-700',
  'Criptomoedas':       'bg-yellow-100 text-yellow-700',
  'Renda Fixa':         'bg-purple-100 text-purple-700',
  'Imóveis':            'bg-orange-100 text-orange-700',
  'Outros':             'bg-gray-100 text-gray-700',
};

// estado vazio do formulário de investimento
const formVazio = { investment_type: 'Ações', asset_name: '', quantity_invested: '', average_price: '', current_market_value: '', broker: '' };

export default function Investimentos() {
  // lê o utilizador do localStorage
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  // lista de investimentos do utilizador
  const [investimentos, setInvestimentos] = useState([]);

  // dados do formulário
  const [form, setForm] = useState(formVazio);

  // id do investimento em edição
  const [editId, setEditId] = useState(null);

  // controla visibilidade do formulário
  const [mostrarForm, setMostrarForm] = useState(false);

  // filtro de tipo selecionado
  const [filtro, setFiltro] = useState('Todos');

  // mensagem de erro
  const [erro, setErro] = useState('');

  // ao montar o componente, carrega os investimentos
  useEffect(() => { buscar(); }, []);

  // busca todos os investimentos do utilizador
  const buscar = async () => {
    try {
      const res = await axios.get(`${API}/investimentos/${usuario.user_id}`);
      setInvestimentos(res.data);
    } catch { setErro('Erro ao carregar investimentos.'); }
  };

  // prepara o formulário para criar novo investimento
  const abrirNovo = () => { setForm(formVazio); setEditId(null); setMostrarForm(true); setErro(''); };

  // prepara o formulário para editar, carregando os dados do investimento selecionado
  const abrirEditar = (i) => {
    setForm({
      investment_type: i.investment_type, asset_name: i.asset_name,
      quantity_invested: i.quantity_invested, average_price: i.average_price,
      // o valor de mercado e a corretora são opcionais, por isso uso string vazia como fallback
      current_market_value: i.current_market_value || '', broker: i.broker || '',
    });
    setEditId(i.investment_id);
    setMostrarForm(true);
    setErro('');
  };

  // envia o formulário para criar ou atualizar o investimento
  const salvar = async (e) => {
    e.preventDefault();
    setErro('');
    try {
      const payload = { ...form, user_id: usuario.user_id };
      if (editId) { await axios.put(`${API}/investimentos/${editId}`, payload); }
      else         { await axios.post(`${API}/investimentos`, payload); }
      setMostrarForm(false);
      buscar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar investimento.');
    }
  };

  // remove o investimento após confirmação
  const remover = async (id) => {
    if (!confirm('Remover este investimento?')) return;
    try { await axios.delete(`${API}/investimentos/${id}`); buscar(); }
    catch { setErro('Erro ao remover investimento.'); }
  };

  // aplica o filtro de tipo à lista ou mostra todos se filtro for "Todos"
  const lista = filtro === 'Todos' ? investimentos : investimentos.filter(i => i.investment_type === filtro);

  // calcula o total investido: quantidade * preço médio de cada ativo
  const totalInvestido = investimentos.reduce((s, i) => s + parseFloat(i.quantity_invested) * parseFloat(i.average_price), 0);

  // calcula o valor atual de mercado apenas para os ativos que têm preço de mercado informado
  const totalMercado = investimentos.filter(i => i.current_market_value)
    .reduce((s, i) => s + parseFloat(i.quantity_invested) * parseFloat(i.current_market_value), 0);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp className="text-blue-600" /> Investimentos
            </h1>
            {/* resumo do total investido e valor de mercado atual */}
            <div className="flex gap-4 mt-1 text-sm">
              <span className="text-gray-500">Investido: <span className="font-bold text-gray-800">R$ {totalInvestido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></span>
              {/* só mostra o valor de mercado se tiver pelo menos um ativo com valor informado */}
              {totalMercado > 0 && (
                <span className="text-gray-500">Mercado: <span className={`font-bold ${totalMercado >= totalInvestido ? 'text-green-600' : 'text-red-600'}`}>
                  R$ {totalMercado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span></span>
              )}
            </div>
          </div>
          <button onClick={abrirNovo}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium">
            <PlusCircle size={16} /> Novo Investimento
          </button>
        </div>

        {/* mensagem de erro */}
        {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">{erro}</div>}

        {/* formulário de criar/editar investimento */}
        {mostrarForm && (
          <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800">{editId ? 'Editar Investimento' : 'Novo Investimento'}</h3>
              <button onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={salvar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Tipo de Investimento *</label>
                <select required className="input"
                  value={form.investment_type} onChange={e => setForm(f => ({ ...f, investment_type: e.target.value }))}>
                  {TIPOS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Nome do Ativo *</label>
                <input required minLength={2} maxLength={100} className="input" placeholder="Ex: PETR4, Bitcoin, CDB Banco X"
                  value={form.asset_name} onChange={e => setForm(f => ({ ...f, asset_name: e.target.value }))}
                />
              </div>
              <div>
                {/* aceita valores muito pequenos para criptomoedas (ex: 0.00001 BTC) */}
                <label className="label">Quantidade / Valor Investido *</label>
                <input required type="number" min="0.00000001" step="any" className="input"
                  value={form.quantity_invested} onChange={e => setForm(f => ({ ...f, quantity_invested: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Preço Médio de Compra (R$) *</label>
                <input required type="number" min="0.00000001" step="any" className="input"
                  value={form.average_price} onChange={e => setForm(f => ({ ...f, average_price: e.target.value }))}
                />
              </div>
              <div>
                {/* valor de mercado é opcional, serve para calcular a rentabilidade */}
                <label className="label">Valor Atual de Mercado (R$, opcional)</label>
                <input type="number" min="0" step="any" className="input"
                  value={form.current_market_value} onChange={e => setForm(f => ({ ...f, current_market_value: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Corretora/Plataforma (opcional)</label>
                <input maxLength={100} className="input" placeholder="Ex: XP, Clear, Binance"
                  value={form.broker} onChange={e => setForm(f => ({ ...f, broker: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2 flex gap-3 justify-end">
                <button type="button" onClick={() => setMostrarForm(false)}
                  className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-50 text-sm">Cancelar</button>
                <button type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 flex items-center gap-1">
                  <Check size={15} /> {editId ? 'Guardar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* botões de filtro por tipo de investimento */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {['Todos', ...TIPOS].map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                filtro === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}>{f}</button>
          ))}
        </div>

        {/* tabela de investimentos com scroll horizontal para telas pequenas */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          {lista.length === 0 ? (
            <p className="text-gray-400 text-center py-12">Nenhum investimento encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Tipo', 'Ativo', 'Quantidade', 'Preço Médio', 'Valor Mercado', 'Rentabilidade', 'Corretora', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lista.map(i => {
                    // pego a rentabilidade calculada pelo backend
                    const rent = i.rentabilidade_pct;
                    return (
                      <tr key={i.investment_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {/* badge colorido com o tipo de investimento */}
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${COR_TIPO[i.investment_type]}`}>
                            {i.investment_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">{i.asset_name}</td>
                        <td className="px-4 py-3 text-gray-600">{parseFloat(i.quantity_invested).toLocaleString('pt-BR')}</td>
                        <td className="px-4 py-3 text-gray-600">R$ {parseFloat(i.average_buy_price).toFixed(2)}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {/* se não tiver valor de mercado informado, mostra traço */}
                          {i.current_market_value ? `R$ ${parseFloat(i.current_market_value).toFixed(2)}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {/* rentabilidade em verde se positiva, vermelho se negativa, com ícone de tendência */}
                          {rent !== null ? (
                            <span className={`flex items-center gap-1 font-medium ${parseFloat(rent) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {parseFloat(rent) >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                              {parseFloat(rent).toFixed(2)}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{i.brokerage_platform || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => abrirEditar(i)} className="p-1.5 rounded hover:bg-blue-50 text-blue-500"><Pencil size={14} /></button>
                            <button onClick={() => remover(i.investment_id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {/* estilos inline para os campos do formulário */}
      <style>{`.input { width: 100%; border: 1px solid #d1d5db; padding: 0.625rem 0.75rem; border-radius: 0.5rem; outline: none; font-size: 0.875rem; } .label { display: block; font-size: 0.75rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }`}</style>
    </Layout>
  );
}
