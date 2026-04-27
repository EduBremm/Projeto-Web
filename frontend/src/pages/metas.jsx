import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { PlusCircle, Pencil, Trash2, PiggyBank, X, Check } from 'lucide-react';

// endereço da API
const API = 'http://127.0.0.1:5000';

// estado vazio do formulário de meta
const formVazio = { goal_name: '', target_amount: '', current_amount: '0', deadline: '', account_id: '' };

// componente de barra de progresso para visualizar quanto da meta já foi atingido
function BarraMeta({ atual, alvo }) {
  // calcula o percentual atingido, máximo de 100%
  const pct = Math.min((atual / alvo) * 100, 100);
  // barra fica verde quando a meta é atingida, azul escuro acima de 60%, azul claro no início
  const cor = pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-blue-500' : 'bg-blue-400';
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        {/* valor atual formatado em reais */}
        <span>R$ {parseFloat(atual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        <span className="font-medium">{pct.toFixed(1)}%</span>
      </div>
      {/* barra de progresso com altura maior que a de orçamentos */}
      <div className="w-full bg-gray-100 rounded-full h-3">
        <div className={`${cor} h-3 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-400 mt-1">
        Alvo: R$ {parseFloat(alvo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
}

export default function Metas() {
  // lê o utilizador do localStorage
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  // lista de metas do utilizador
  const [metas, setMetas] = useState([]);

  // contas de poupança/investimento para associar à meta
  const [contas, setContas] = useState([]);

  // dados do formulário
  const [form, setForm] = useState(formVazio);

  // id da meta em edição
  const [editId, setEditId] = useState(null);

  // controla visibilidade do formulário
  const [mostrarForm, setMostrarForm] = useState(false);

  // mensagem de erro
  const [erro, setErro] = useState('');

  // ao montar, carrega metas e contas
  useEffect(() => { buscar(); buscarContas(); }, []);

  // busca as metas do utilizador
  const buscar = async () => {
    try {
      const res = await axios.get(`${API}/metas/${usuario.user_id}`);
      setMetas(res.data);
    } catch { setErro('Erro ao carregar metas.'); }
  };

  // busca as contas mas filtra apenas poupança e investimento, que fazem sentido para metas
  const buscarContas = async () => {
    try {
      const res = await axios.get(`${API}/contas/${usuario.user_id}`);
      setContas(res.data.filter(c => ['Poupança','Investimento'].includes(c.account_type)));
    } catch {}
  };

  // abre o formulário no modo de criação de nova meta
  const abrirNovo = () => { setForm(formVazio); setEditId(null); setMostrarForm(true); setErro(''); };

  // abre o formulário no modo de edição com os dados da meta selecionada
  const abrirEditar = (m) => {
    setForm({
      goal_name: m.goal_name, target_amount: m.target_amount,
      current_amount: m.current_amount,
      // formata a data para o padrão do input date (YYYY-MM-DD)
      deadline: m.deadline?.slice(0, 10) || '',
      account_id: m.account_id || '',
    });
    setEditId(m.goal_id);
    setMostrarForm(true);
    setErro('');
  };

  // envia o formulário para criar ou atualizar a meta
  const salvar = async (e) => {
    e.preventDefault();
    setErro('');
    try {
      const payload = { ...form, user_id: usuario.user_id };
      if (editId) { await axios.put(`${API}/metas/${editId}`, payload); }
      else         { await axios.post(`${API}/metas`, payload); }
      setMostrarForm(false);
      buscar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar meta.');
    }
  };

  // remove a meta após confirmação
  const remover = async (id) => {
    if (!confirm('Remover esta meta?')) return;
    try { await axios.delete(`${API}/metas/${id}`); buscar(); }
    catch { setErro('Erro ao remover meta.'); }
  };

  // conta quantas metas já foram atingidas para mostrar no subtítulo
  const atingidas = metas.filter(m => parseFloat(m.current_amount) >= parseFloat(m.target_amount)).length;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <PiggyBank className="text-blue-600" /> Metas de Poupança
            </h1>
            {/* mostra o total de metas e quantas já foram atingidas */}
            <p className="text-gray-500 text-sm mt-1">
              {metas.length} metas · {atingidas} atingida(s)
            </p>
          </div>
          <button onClick={abrirNovo}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium">
            <PlusCircle size={16} /> Nova Meta
          </button>
        </div>

        {/* mensagem de erro */}
        {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">{erro}</div>}

        {/* formulário de criar/editar meta */}
        {mostrarForm && (
          <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800">{editId ? 'Editar Meta' : 'Nova Meta'}</h3>
              <button onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={salvar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Nome da Meta *</label>
                <input required minLength={3} maxLength={100} className="input" placeholder="Ex: Viagem para Portugal"
                  value={form.goal_name} onChange={e => setForm(f => ({ ...f, goal_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Valor Alvo (R$) *</label>
                <input required type="number" min="0.01" step="0.01" className="input"
                  value={form.target_amount} onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))}
                />
              </div>
              <div>
                {/* o valor atual pode ser atualizado manualmente conforme o utilizador vai poupando */}
                <label className="label">Valor Atual (R$)</label>
                <input type="number" min="0" step="0.01" className="input"
                  value={form.current_amount} onChange={e => setForm(f => ({ ...f, current_amount: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Data Limite (opcional)</label>
                <input type="date" className="input"
                  value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                />
              </div>
              <div>
                {/* só aparecem contas de poupança e investimento neste select */}
                <label className="label">Conta Associada (opcional)</label>
                <select className="input"
                  value={form.account_id} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}>
                  <option value="">Nenhuma</option>
                  {contas.map(c => <option key={c.account_id} value={c.account_id}>{c.account_name} ({c.account_type})</option>)}
                </select>
              </div>
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

        {/* grelha de cards de metas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metas.length === 0 ? (
            <p className="text-gray-400 text-center py-12 md:col-span-2">Nenhuma meta definida.</p>
          ) : metas.map(m => {
            // verifica se a meta foi atingida para destacar o card com borda verde
            const atingida = parseFloat(m.current_amount) >= parseFloat(m.target_amount);
            return (
              <div key={m.goal_id} className={`bg-white rounded-2xl shadow-sm border p-5 ${atingida ? 'border-green-300' : ''}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800">{m.goal_name}</h3>
                      {/* badge verde de "Atingida!" só aparece quando a meta foi cumprida */}
                      {atingida && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Atingida!</span>}
                    </div>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {/* mostra o prazo se estiver definido */}
                      {m.deadline && <span className="text-xs text-gray-400">Prazo: {new Date(m.deadline).toLocaleDateString('pt-BR')}</span>}
                      {/* mostra o nome da conta associada se existir */}
                      {m.account_name && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{m.account_name}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => abrirEditar(m)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil size={14} /></button>
                    <button onClick={() => remover(m.goal_id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
                {/* barra de progresso visual da meta */}
                <BarraMeta atual={m.current_amount} alvo={m.target_amount} />
              </div>
            );
          })}
        </div>
      </div>
      {/* estilos inline para os campos do formulário */}
      <style>{`.input { width: 100%; border: 1px solid #d1d5db; padding: 0.625rem 0.75rem; border-radius: 0.5rem; outline: none; font-size: 0.875rem; } .label { display: block; font-size: 0.75rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }`}</style>
    </Layout>
  );
}
