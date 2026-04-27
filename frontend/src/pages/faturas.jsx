// importa hooks do React e bibliotecas necessárias
import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
// ícones da página de faturas
import { PlusCircle, Pencil, Trash2, FileText, X, Check, AlertCircle } from 'lucide-react';

// endereço base da API do backend
const API = 'http://127.0.0.1:5000';
// opções de recorrência disponíveis para uma fatura
const RECORRENCIAS = ['Única', 'Mensal', 'Anual'];
// mapa de cores pra cada status de fatura (paga, pendente, atrasada)
const STATUS_COR = { Paga: 'bg-green-100 text-green-700', Pendente: 'bg-yellow-100 text-yellow-700', Atrasada: 'bg-red-100 text-red-700' };
// estado vazio do formulário de nova fatura
const formVazio = { bill_name: '', amount: '', due_date: '', payment_date: '', status: 'Pendente', recurrence: 'Única', category_id: '', account_id: '' };

export default function Faturas() {
  // pega o usuário salvo no localStorage pra saber o user_id
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  // lista de faturas do usuário
  const [faturas, setFaturas] = useState([]);
  // categorias de despesa pra preencher o select do formulário
  const [categorias, setCategorias] = useState([]);
  // contas disponíveis pra associar à fatura
  const [contas, setContas] = useState([]);
  // dados do formulário de criar/editar fatura
  const [form, setForm] = useState(formVazio);
  // guarda o id da fatura em edição (null = modo criação)
  const [editId, setEditId] = useState(null);
  // controla se o formulário está visível
  const [mostrarForm, setMostrarForm] = useState(false);
  // filtro de status selecionado na listagem
  const [filtro, setFiltro] = useState('Todas');
  // mensagem de erro pra mostrar ao usuário
  const [erro, setErro] = useState('');

  // ao montar o componente, carrega faturas e os dados auxiliares (categorias e contas)
  useEffect(() => { buscar(); buscarAuxiliar(); }, []);

  // busca todas as faturas do usuário na API
  const buscar = async () => {
    try {
      const res = await axios.get(`${API}/faturas/${usuario.user_id}`);
      setFaturas(res.data);
    } catch { setErro('Erro ao carregar faturas.'); }
  };

  // busca categorias e contas em paralelo pra popular os selects do formulário
  const buscarAuxiliar = async () => {
    const [c, a] = await Promise.all([
      axios.get(`${API}/categorias/${usuario.user_id}`),
      axios.get(`${API}/contas/${usuario.user_id}`),
    ]);
    // só mostra categorias do tipo Despesa no select de categorias
    setCategorias(c.data.filter(x => x.category_type === 'Despesa'));
    setContas(a.data);
  };

  // prepara o formulário no modo de criar nova fatura
  const abrirNovo = () => { setForm(formVazio); setEditId(null); setMostrarForm(true); setErro(''); };

  // prepara o formulário pra editar uma fatura existente, carregando os dados dela
  const abrirEditar = (f) => {
    setForm({
      bill_name: f.bill_name, amount: f.amount, due_date: f.due_date?.slice(0, 10) || '',
      // formata a data de pagamento cortando a parte de horas se vier do backend
      payment_date: f.payment_date?.slice(0, 10) || '', status: f.status,
      recurrence: f.recurrence || 'Única', category_id: f.category_id || '', account_id: f.account_id || '',
    });
    setEditId(f.bill_id);
    setMostrarForm(true);
    setErro('');
  };

  // envia o formulário pro backend — faz PUT se for edição ou POST se for nova
  const salvar = async (e) => {
    e.preventDefault();
    setErro('');
    try {
      const payload = { ...form, user_id: usuario.user_id };
      if (editId) { await axios.put(`${API}/faturas/${editId}`, payload); }
      else         { await axios.post(`${API}/faturas`, payload); }
      setMostrarForm(false);
      buscar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar fatura.');
    }
  };

  // remove uma fatura após confirmação do usuário
  const remover = async (id) => {
    if (!confirm('Remover esta fatura?')) return;
    try { await axios.delete(`${API}/faturas/${id}`); buscar(); }
    catch { setErro('Erro ao remover fatura.'); }
  };

  // filtra as faturas pelo status selecionado (ou mostra todas)
  const lista = faturas.filter(f => filtro === 'Todas' || f.status === filtro);
  // conta quantas faturas estão atrasadas pra mostrar alerta no topo
  const atrasadas = faturas.filter(f => f.status === 'Atrasada').length;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* cabeçalho com título e aviso de faturas atrasadas */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="text-blue-600" /> Faturas / Contas a Pagar
            </h1>
            {/* alerta de faturas atrasadas só aparece se houver alguma */}
            {atrasadas > 0 && (
              <p className="text-red-600 text-sm flex items-center gap-1 mt-1">
                <AlertCircle size={14} /> {atrasadas} fatura(s) atrasada(s)
              </p>
            )}
          </div>
          <button onClick={abrirNovo}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium">
            <PlusCircle size={16} /> Nova Fatura
          </button>
        </div>

        {/* exibe erro se tiver algum problema */}
        {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">{erro}</div>}

        {/* Formulário de criação/edição — só aparece quando mostrarForm é true */}
        {mostrarForm && (
          <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              {/* título do formulário muda se for edição ou criação */}
              <h3 className="font-bold text-gray-800">{editId ? 'Editar Fatura' : 'Nova Fatura'}</h3>
              <button onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={salvar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* nome da fatura, ex: Aluguel, Internet */}
              <div className="md:col-span-2">
                <label className="label">Nome da Fatura *</label>
                <input required minLength={3} maxLength={100} className="input" placeholder="Ex: Aluguel, Internet..."
                  value={form.bill_name} onChange={e => setForm(f => ({ ...f, bill_name: e.target.value }))}
                />
              </div>
              {/* valor da fatura */}
              <div>
                <label className="label">Valor (R$) *</label>
                <input required type="number" min="0.01" step="0.01" className="input"
                  value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
              {/* data de vencimento da fatura */}
              <div>
                <label className="label">Data de Vencimento *</label>
                <input required type="date" className="input"
                  value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                />
              </div>
              {/* status atual da fatura */}
              <div>
                <label className="label">Status *</label>
                <select required className="input"
                  value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option>Pendente</option>
                  <option>Paga</option>
                  <option>Atrasada</option>
                </select>
              </div>
              {/* campo de data de pagamento só aparece se o status for "Paga" */}
              {form.status === 'Paga' && (
                <div>
                  <label className="label">Data de Pagamento</label>
                  <input type="date" className="input"
                    value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))}
                  />
                </div>
              )}
              {/* recorrência da fatura (única, mensal ou anual) */}
              <div>
                <label className="label">Recorrência</label>
                <select className="input"
                  value={form.recurrence} onChange={e => setForm(f => ({ ...f, recurrence: e.target.value }))}>
                  {RECORRENCIAS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              {/* categoria da fatura — só mostra categorias de despesa */}
              <div>
                <label className="label">Categoria *</label>
                <select required className="input"
                  value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {categorias.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
                </select>
              </div>
              {/* conta que vai pagar essa fatura */}
              <div>
                <label className="label">Conta de Origem *</label>
                <select required className="input"
                  value={form.account_id} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {contas.map(c => <option key={c.account_id} value={c.account_id}>{c.account_name}</option>)}
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

        {/* Filtros de status — permite ver todas ou filtrar por Pendente/Atrasada/Paga */}
        <div className="flex gap-2 mb-4">
          {['Todas', 'Pendente', 'Atrasada', 'Paga'].map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                filtro === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}>{f}</button>
          ))}
        </div>

        {/* Lista de faturas filtradas pelo status selecionado */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          {lista.length === 0 ? (
            <p className="text-gray-400 text-center py-12">Nenhuma fatura encontrada.</p>
          ) : (
            <div className="divide-y">
              {lista.map(f => (
                <div key={f.bill_id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {/* badge colorido com o status da fatura */}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COR[f.status]}`}>{f.status}</span>
                      {/* badge de recorrência só aparece se não for única */}
                      {f.recurrence && f.recurrence !== 'Única' && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{f.recurrence}</span>
                      )}
                    </div>
                    <p className="font-medium text-gray-800">{f.bill_name}</p>
                    {/* data de vencimento, categoria e conta associada */}
                    <p className="text-xs text-gray-400">
                      Vence: {new Date(f.due_date).toLocaleDateString('pt-BR')}
                      {f.category_name ? ` · ${f.category_name}` : ''}
                      {f.account_name ? ` · ${f.account_name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* valor da fatura em destaque */}
                    <span className="font-bold text-gray-800">R$ {parseFloat(f.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    {/* botões de editar e remover */}
                    <button onClick={() => abrirEditar(f)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil size={15} /></button>
                    <button onClick={() => remover(f.bill_id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* estilos inline reutilizáveis pra input e label do formulário */}
      <style>{`.input { width: 100%; border: 1px solid #d1d5db; padding: 0.625rem 0.75rem; border-radius: 0.5rem; outline: none; font-size: 0.875rem; } .label { display: block; font-size: 0.75rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }`}</style>
    </Layout>
  );
}
