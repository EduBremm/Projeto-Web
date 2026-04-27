// importa os hooks do React e bibliotecas necessárias
import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
// ícones da página de orçamentos
import { PlusCircle, Pencil, Trash2, Target, X, Check, AlertTriangle } from 'lucide-react';

// endereço base da API do backend
const API = 'http://127.0.0.1:5000';
// períodos disponíveis pra um orçamento
const PERIODOS = ['Mensal', 'Semestral', 'Anual'];
// estado inicial vazio do formulário de orçamento
const formVazio = { budget_name: '', category_id: '', limit_amount: '', period: 'Mensal' };

// componente de barra de progresso do orçamento — muda de cor conforme o gasto
function BarraProgresso({ gasto, limite }) {
  // calcula a porcentagem gasta, limitando em 100%
  const pct = Math.min((gasto / limite) * 100, 100);
  // vermelho se excedeu, amarelo se está perto, azul se está ok
  const cor = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-blue-500';
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>R$ {parseFloat(gasto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} gastos</span>
        <span>{pct.toFixed(0)}%</span>
      </div>
      {/* trilha cinza com barra colorida em cima */}
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`${cor} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-400 mt-1">
        Limite: R$ {parseFloat(limite).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
}

export default function Orcamentos() {
  // pega o usuário salvo no localStorage pra saber o user_id
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  // lista de orçamentos do usuário
  const [orcamentos, setOrcamentos] = useState([]);
  // categorias de despesa pra popular o select do formulário
  const [categorias, setCategorias] = useState([]);
  // dados do formulário de criar/editar orçamento
  const [form, setForm] = useState(formVazio);
  // guarda o id do orçamento em edição (null = modo criação)
  const [editId, setEditId] = useState(null);
  // controla se o formulário está visível
  const [mostrarForm, setMostrarForm] = useState(false);
  // mensagem de erro pra mostrar ao usuário
  const [erro, setErro] = useState('');

  // ao montar o componente, carrega orçamentos e categorias
  useEffect(() => { buscar(); buscarCategorias(); }, []);

  // busca todos os orçamentos do usuário na API
  const buscar = async () => {
    try {
      const res = await axios.get(`${API}/orcamentos/${usuario.user_id}`);
      setOrcamentos(res.data);
    } catch { setErro('Erro ao carregar orçamentos.'); }
  };

  // busca categorias e filtra só as de Despesa, porque orçamento é pra controlar gastos
  const buscarCategorias = async () => {
    try {
      const res = await axios.get(`${API}/categorias/${usuario.user_id}`);
      setCategorias(res.data.filter(c => c.category_type === 'Despesa'));
    } catch {}
  };

  // prepara o formulário no modo de criar novo orçamento
  const abrirNovo = () => { setForm(formVazio); setEditId(null); setMostrarForm(true); setErro(''); };

  // prepara o formulário pra editar um orçamento existente, carregando os dados
  const abrirEditar = (o) => {
    setForm({ budget_name: o.budget_name, category_id: o.category_id, limit_amount: o.limit_amount, period: o.period });
    setEditId(o.budget_id);
    setMostrarForm(true);
    setErro('');
  };

  // envia o formulário pro backend — PUT pra edição e POST pra criação
  const salvar = async (e) => {
    e.preventDefault();
    setErro('');
    try {
      const payload = { ...form, user_id: usuario.user_id };
      if (editId) { await axios.put(`${API}/orcamentos/${editId}`, payload); }
      else         { await axios.post(`${API}/orcamentos`, payload); }
      setMostrarForm(false);
      buscar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar orçamento.');
    }
  };

  // remove um orçamento após confirmação
  const remover = async (id) => {
    if (!confirm('Remover este orçamento?')) return;
    try { await axios.delete(`${API}/orcamentos/${id}`); buscar(); }
    catch { setErro('Erro ao remover orçamento.'); }
  };

  // conta quantos orçamentos foram excedidos pra mostrar aviso no topo
  const excedidos = orcamentos.filter(o => parseFloat(o.spent) >= parseFloat(o.limit_amount)).length;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* cabeçalho com título e aviso de orçamentos excedidos */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Target className="text-blue-600" /> Orçamentos
            </h1>
            {/* alerta de excedidos só aparece se tiver algum */}
            {excedidos > 0 && (
              <p className="text-yellow-600 text-sm flex items-center gap-1 mt-1">
                <AlertTriangle size={14} /> {excedidos} orçamento(s) excedido(s)
              </p>
            )}
          </div>
          <button onClick={abrirNovo}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium">
            <PlusCircle size={16} /> Novo Orçamento
          </button>
        </div>

        {/* exibe erro se tiver algum problema */}
        {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">{erro}</div>}

        {/* Formulário de criação/edição de orçamento */}
        {mostrarForm && (
          <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              {/* título muda conforme modo de edição ou criação */}
              <h3 className="font-bold text-gray-800">{editId ? 'Editar Orçamento' : 'Novo Orçamento'}</h3>
              <button onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={salvar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* nome do orçamento, ex: Alimentação Mensal */}
              <div className="md:col-span-2">
                <label className="label">Nome do Orçamento *</label>
                <input required minLength={3} maxLength={100} className="input" placeholder="Ex: Alimentação Mensal"
                  value={form.budget_name} onChange={e => setForm(f => ({ ...f, budget_name: e.target.value }))}
                />
              </div>
              {/* categoria de despesa associada ao orçamento */}
              <div>
                <label className="label">Categoria (Despesa) *</label>
                <select required className="input"
                  value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {categorias.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
                </select>
              </div>
              {/* valor máximo permitido para o orçamento */}
              <div>
                <label className="label">Valor Limite (R$) *</label>
                <input required type="number" min="0.01" step="0.01" className="input"
                  value={form.limit_amount} onChange={e => setForm(f => ({ ...f, limit_amount: e.target.value }))}
                />
              </div>
              {/* período do orçamento (mensal, semestral ou anual) */}
              <div>
                <label className="label">Período *</label>
                <select required className="input"
                  value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))}>
                  {PERIODOS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              {/* botões de cancelar e salvar */}
              <div className="md:col-span-2 flex gap-3 justify-end">
                <button type="button" onClick={() => setMostrarForm(false)}
                  className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-50 text-sm">Cancelar</button>
                <button type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 flex items-center gap-1">
                  <Check size={15} /> {editId ? 'Guardar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* grid de cards dos orçamentos — 2 colunas no desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orcamentos.length === 0 ? (
            <p className="text-gray-400 text-center py-12 md:col-span-2">Nenhum orçamento definido.</p>
          ) : orcamentos.map(o => {
            // verifica se o orçamento foi excedido pra destacar o card com borda vermelha
            const excedido = parseFloat(o.spent) >= parseFloat(o.limit_amount);
            return (
              <div key={o.budget_id} className={`bg-white rounded-2xl shadow-sm border p-5 ${excedido ? 'border-red-300' : ''}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800">{o.budget_name}</h3>
                      {/* ícone de aviso aparece se o orçamento foi excedido */}
                      {excedido && <AlertTriangle size={14} className="text-red-500" />}
                    </div>
                    <div className="flex gap-2 mt-1">
                      {/* badge da categoria e do período do orçamento */}
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{o.category_name}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{o.period}</span>
                    </div>
                  </div>
                  {/* botões de editar e remover o orçamento */}
                  <div className="flex gap-1">
                    <button onClick={() => abrirEditar(o)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil size={14} /></button>
                    <button onClick={() => remover(o.budget_id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
                {/* barra de progresso que mostra quanto do orçamento já foi gasto */}
                <BarraProgresso gasto={o.spent} limite={o.limit_amount} />
              </div>
            );
          })}
        </div>
      </div>
      {/* estilos inline reutilizáveis pra input e label do formulário */}
      <style>{`.input { width: 100%; border: 1px solid #d1d5db; padding: 0.625rem 0.75rem; border-radius: 0.5rem; outline: none; font-size: 0.875rem; } .label { display: block; font-size: 0.75rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }`}</style>
    </Layout>
  );
}
